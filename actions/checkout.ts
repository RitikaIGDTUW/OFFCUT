"use server";
import { revalidateTag } from "next/cache";
import { Types } from "mongoose";
import { dbConnect, withOptionalTransaction } from "@/lib/db";
import { actionError, assertRole } from "@/lib/guards";
import { features, env } from "@/lib/env";
import { checkoutSchema, cartLinesSchema, verifyPaymentSchema } from "@/lib/validations/shop";
import { createRazorpayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import {
  CheckoutError,
  clearUserCart,
  decrementStock,
  markOrderPaid,
  quote,
  recordCouponUse,
  releaseStaleOrders,
  sendOrderConfirmation,
} from "@/lib/orders";
import { nextOrderNumber } from "@/models/Counter";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import type { ActionResult } from "@/lib/utils";

const ANY = ["buyer", "supplier", "admin"] as const;

export type RazorpayParams = {
  key: string;
  orderId: string;
  amount: number; // paise
  name: string;
  email: string;
  contact: string;
  orderNumber: string;
};

function friendly(e: unknown) {
  if (e instanceof CheckoutError) return { ok: false as const, error: e.message };
  return actionError(e);
}

/** Live, server-computed totals for the cart & checkout pages (authoritative preview). */
export async function getQuote(lines: { productId: string; qty: number }[], couponCode: string, method: "standard" | "express") {
  try {
    const user = await assertRole([...ANY]);
    const parsed = cartLinesSchema.parse(lines);
    if (!parsed.length) return { ok: true as const, data: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, totalKg: 0, coupon: null, codEnabled: false, taxRate: 0 } };
    const q = await quote(parsed, user.id, couponCode || undefined, method);
    return { ok: true as const, data: { ...q.totals, coupon: q.coupon, codEnabled: q.settings.codEnabled, taxRate: q.settings.taxRate } };
  } catch (e) {
    return friendly(e);
  }
}

/**
 * Places an order:
 *  1. re-validate every line against MongoDB (price + stock), validate coupon
 *  2. in one transaction: atomically decrement stock + create the order
 *  3. COD → done; Razorpay → create a Razorpay order and return checkout params
 */
export async function placeOrder(input: unknown): Promise<ActionResult<{ orderNumber: string; razorpay?: RazorpayParams }>> {
  try {
    const user = await assertRole([...ANY]);
    const data = checkoutSchema.parse(input);
    await dbConnect();
    await releaseStaleOrders();

    const q = await quote(data.items, user.id, data.couponCode || undefined, data.shippingMethod);
    if (data.paymentMethod === "cod" && !q.settings.codEnabled) return { ok: false, error: "Cash on Delivery is currently disabled." };
    if (data.paymentMethod === "razorpay" && !features.razorpay) return { ok: false, error: "Online payment is not configured — please choose Cash on Delivery." };

    const orderNumber = await nextOrderNumber();
    const address = { ...data.address, line2: data.address.line2 || undefined, country: data.address.country || "India" };

    const order = await withOptionalTransaction(async (session) => {
      await decrementStock(q.items, session);
      const [created] = await Order.create(
        [
          {
            orderNumber,
            userId: user.id,
            email: user.email,
            items: q.items.map(({ materialType: _m, available: _a, ...rest }) => rest),
            shippingAddress: address,
            shippingMethod: data.shippingMethod,
            subtotal: q.totals.subtotal,
            shipping: q.totals.shipping,
            tax: q.totals.tax,
            taxRate: q.settings.taxRate,
            discount: q.totals.discount,
            total: q.totals.total,
            couponCode: q.coupon?.code,
            paymentMethod: data.paymentMethod,
            paymentStatus: "pending",
            orderStatus: "placed",
            statusHistory: [{ status: "placed", note: data.paymentMethod === "cod" ? "Cash on delivery" : "Awaiting online payment", at: new Date(), by: user.email }],
            kgDiverted: Number(q.kgDiverted.toFixed(2)),
            co2SavedKg: Number(q.co2SavedKg.toFixed(1)),
          },
        ],
        { session },
      );
      return created;
    });

    if (data.saveAddress) {
      const u = await User.findById(user.id).select("addresses");
      const exists = u?.addresses.some((a) => a.line1 === address.line1 && a.pincode === address.pincode);
      if (u && !exists && u.addresses.length < 10) {
        u.addresses.push({ ...address, label: address.label || "Home", isDefault: u.addresses.length === 0, _id: new Types.ObjectId() });
        await u.save();
      }
    }
    revalidateTag("catalog");

    if (data.paymentMethod === "cod") {
      await recordCouponUse(order.couponCode, user.id);
      await clearUserCart(user.id);
      await sendOrderConfirmation(order);
      return { ok: true, data: { orderNumber } };
    }

    const rz = await createRazorpayOrder(order.total, orderNumber, { orderNumber, userId: user.id });
    await Order.updateOne({ _id: order._id }, { razorpayOrderId: rz.id });
    const u = await User.findById(user.id).select("name email phone").lean();
    return {
      ok: true,
      data: {
        orderNumber,
        razorpay: { key: env.RAZORPAY_KEY_ID, orderId: rz.id, amount: rz.amount, name: u?.name ?? "", email: u?.email ?? "", contact: address.phone, orderNumber },
      },
    };
  } catch (e) {
    return friendly(e);
  }
}

/**
 * Called by the browser after Razorpay Checkout succeeds. We recompute the HMAC-SHA256
 * signature with our secret; only a matching signature marks the order as paid.
 */
export async function verifyPayment(input: unknown): Promise<ActionResult<{ orderNumber: string }>> {
  try {
    const user = await assertRole([...ANY]);
    const d = verifyPaymentSchema.parse(input);
    const order = await Order.findOne({ orderNumber: d.orderNumber, userId: user.id });
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === "paid") return { ok: true, data: { orderNumber: order.orderNumber } }; // idempotent
    if (order.razorpayOrderId !== d.razorpay_order_id) return { ok: false, error: "Payment does not belong to this order." };
    if (!verifyPaymentSignature(d.razorpay_order_id, d.razorpay_payment_id, d.razorpay_signature)) {
      order.statusHistory.push({ status: "payment-failed", note: "Signature verification failed", at: new Date(), by: "system" });
      await order.save();
      return { ok: false, error: "Payment could not be verified. You have not been charged twice — please retry." };
    }
    await markOrderPaid(order, d.razorpay_payment_id, user.email);
    revalidateTag("orders");
    return { ok: true, data: { orderNumber: order.orderNumber } };
  } catch (e) {
    return friendly(e);
  }
}

/** Retry payment for a pending Razorpay order (Razorpay order ids accept multiple attempts). */
export async function retryPayment(orderNumber: string): Promise<ActionResult<{ orderNumber: string; razorpay?: RazorpayParams }>> {
  try {
    const user = await assertRole([...ANY]);
    await releaseStaleOrders();
    const order = await Order.findOne({ orderNumber, userId: user.id });
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === "paid") return { ok: false, error: "This order is already paid." };
    if (order.orderStatus === "cancelled") return { ok: false, error: "This order was cancelled because payment wasn't completed. Please order again." };
    if (order.paymentMethod !== "razorpay") return { ok: false, error: "This is a Cash on Delivery order." };
    let rzId = order.razorpayOrderId;
    if (!rzId) {
      rzId = (await createRazorpayOrder(order.total, order.orderNumber)).id;
      order.razorpayOrderId = rzId;
      await order.save();
    }
    const u = await User.findById(user.id).select("name email").lean();
    return {
      ok: true,
      data: {
        orderNumber,
        razorpay: { key: env.RAZORPAY_KEY_ID, orderId: rzId, amount: Math.round(order.total * 100), name: u?.name ?? "", email: u?.email ?? "", contact: order.shippingAddress.phone, orderNumber },
      },
    };
  } catch (e) {
    return friendly(e);
  }
}

/** Records a failed attempt (order stays `pending` so the buyer can retry). */
export async function reportPaymentFailure(orderNumber: string, reason: string): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    await Order.updateOne(
      { orderNumber, userId: user.id, paymentStatus: { $ne: "paid" } },
      { $push: { statusHistory: { status: "payment-attempt-failed", note: reason.slice(0, 200), at: new Date(), by: "razorpay" } } },
    );
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

