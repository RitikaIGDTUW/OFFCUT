import "server-only";
import { createElement } from "react";
import type { ClientSession, Types } from "mongoose";
import { dbConnect } from "./db";
import { computeTotals, lineWeight, type CouponLike } from "./pricing";
import { formatDims } from "./utils";
import { sendEmail, siteUrl } from "./email";
import { getSettings } from "./settings";
import { Product, co2Factor, type IProduct } from "@/models/Product";
import { Order, type IOrder, type IOrderItem } from "@/models/Order";
import { Coupon, Payout, Cart } from "@/models/misc";
import { Supplier } from "@/models/Supplier";
import { User } from "@/models/User";
import { OrderConfirmationEmail, OrderStatusEmail } from "@/components/emails/templates";

export class CheckoutError extends Error {}

/* ───────── Coupons ───────── */
export async function validateCoupon(code: string | undefined, userId: string, subtotal: number): Promise<CouponLike> {
  if (!code) return null;
  await dbConnect();
  const c = await Coupon.findOne({ code: code.toUpperCase().trim() }).lean();
  const now = new Date();
  if (!c || !c.isActive) throw new CheckoutError("That coupon code isn't valid.");
  if (c.startsAt && c.startsAt > now) throw new CheckoutError("That coupon isn't active yet.");
  if (c.expiresAt && c.expiresAt < now) throw new CheckoutError("That coupon has expired.");
  if (c.maxUses && c.usedCount >= c.maxUses) throw new CheckoutError("That coupon has been fully used.");
  if (subtotal < c.minOrder) throw new CheckoutError(`Coupon needs a minimum order of ₹${c.minOrder}.`);
  const mine = c.usedBy.find((u) => u.userId.toString() === userId)?.count ?? 0;
  if (c.perUserLimit && mine >= c.perUserLimit) throw new CheckoutError("You've already used this coupon.");
  return { code: c.code, type: c.type, value: c.value };
}

/* ───────── Re-pricing from the database (the browser's prices are never trusted) ───────── */
export type PricedItem = IOrderItem & { materialType: string; available: number };

export async function priceLines(lines: { productId: string; qty: number }[]): Promise<PricedItem[]> {
  await dbConnect();
  const ids = lines.map((l) => l.productId);
  const products = await Product.find({ _id: { $in: ids } }).lean<IProduct[]>();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  return lines.map((l) => {
    const p = byId.get(l.productId);
    if (!p || p.status !== "active") throw new CheckoutError(`A lot in your cart is no longer available. Please refresh your cart.`);
    if (!p.sellByWeight && !Number.isInteger(l.qty)) throw new CheckoutError(`Quantity for ${p.title} must be a whole number.`);
    if (l.qty > p.quantityAvailable) throw new CheckoutError(`Only ${p.quantityAvailable} left of LOT #${p.lotNumber} (${p.title}).`);
    return {
      productId: p._id,
      supplierId: p.supplierId ?? null,
      title: p.title,
      slug: p.slug,
      lotNumber: p.lotNumber,
      image: p.images[0]?.url,
      specs: formatDims(p.dimensions),
      unitType: p.unitType,
      sellByWeight: p.sellByWeight,
      weightKg: p.weightKg,
      price: p.price,
      qty: l.qty,
      materialType: p.materialType,
      available: p.quantityAvailable,
    };
  });
}

export async function quote(
  lines: { productId: string; qty: number }[],
  userId: string,
  couponCode: string | undefined,
  method: "standard" | "express",
) {
  const items = await priceLines(lines);
  const settings = await getSettings();
  const pre = items.reduce((s, i) => s + i.price * i.qty, 0);
  const coupon = await validateCoupon(couponCode || undefined, userId, pre);
  const totals = computeTotals(items, settings.shipping, settings.taxRate, coupon, method);
  const kgDiverted = items.reduce((s, i) => s + lineWeight(i), 0);
  const co2SavedKg = items.reduce((s, i) => s + lineWeight(i) * co2Factor(i.materialType), 0);
  return { items, totals, coupon, settings, kgDiverted, co2SavedKg };
}

/* ───────── Stock ───────── */
/**
 * Atomically decrements stock for every line. The filter `quantityAvailable >= qty` makes the
 * check-and-decrement a single atomic operation, so two buyers can never both get the last piece.
 * Without a transaction (standalone local mongod) we roll back already-decremented lines manually.
 */
export async function decrementStock(items: { productId: Types.ObjectId; qty: number; title: string }[], session: ClientSession | null) {
  const done: typeof items = [];
  try {
    for (const it of items) {
      const res = await Product.updateOne(
        { _id: it.productId, status: "active", quantityAvailable: { $gte: it.qty } },
        { $inc: { quantityAvailable: -it.qty, soldQty: it.qty } },
        { session: session ?? undefined },
      );
      if (res.modifiedCount !== 1) throw new CheckoutError(`Sorry — ${it.title} just sold out or has less stock than requested.`);
      done.push(it);
    }
    await Product.updateMany(
      { _id: { $in: items.map((i) => i.productId) }, quantityAvailable: { $lte: 0 }, status: "active" },
      { status: "sold-out" },
      { session: session ?? undefined },
    );
  } catch (e) {
    if (!session) {
      for (const it of done) await Product.updateOne({ _id: it.productId }, { $inc: { quantityAvailable: it.qty, soldQty: -it.qty } });
    }
    throw e;
  }
}

/** Puts stock back when an order is cancelled/returned (idempotent via `stockRestored`). */
export async function restoreStock(order: IOrder) {
  if (order.stockRestored) return;
  for (const it of order.items) {
    await Product.updateOne({ _id: it.productId }, { $inc: { quantityAvailable: it.qty, soldQty: -it.qty } });
    await Product.updateOne({ _id: it.productId, status: "sold-out", quantityAvailable: { $gt: 0 } }, { status: "active" });
  }
  await Order.updateOne({ _id: order._id }, { stockRestored: true });
}

/**
 * Razorpay orders reserve stock while the buyer pays. If a payment is abandoned for more than
 * 30 minutes we cancel the order and release the stock. Called lazily (no cron needed locally).
 */
export async function releaseStaleOrders() {
  const cutoff = new Date(Date.now() - 30 * 60_000);
  const stale = await Order.find({ paymentMethod: "razorpay", paymentStatus: { $in: ["pending", "failed"] }, orderStatus: "placed", createdAt: { $lt: cutoff } });
  for (const o of stale) {
    o.orderStatus = "cancelled";
    o.statusHistory.push({ status: "cancelled", note: "Payment not completed within 30 minutes — stock released.", at: new Date(), by: "system" });
    await o.save();
    await restoreStock(o);
  }
}

/* ───────── After payment ───────── */
export async function recordCouponUse(code: string | undefined, userId: string) {
  if (!code) return;
  const res = await Coupon.updateOne({ code, "usedBy.userId": userId }, { $inc: { usedCount: 1, "usedBy.$.count": 1 } });
  if (res.matchedCount === 0) await Coupon.updateOne({ code }, { $inc: { usedCount: 1 }, $push: { usedBy: { userId, count: 1 } } });
}

/** Creates one payout ledger entry per supplier in the order (idempotent). */
export async function createPayouts(order: IOrder) {
  const bySupplier = new Map<string, { gross: number; kg: number }>();
  for (const it of order.items) {
    if (!it.supplierId) continue;
    const k = it.supplierId.toString();
    const cur = bySupplier.get(k) ?? { gross: 0, kg: 0 };
    cur.gross += it.price * it.qty;
    cur.kg += it.sellByWeight ? it.qty : it.weightKg * it.qty;
    bySupplier.set(k, cur);
  }
  for (const [supplierId, { gross, kg }] of bySupplier) {
    const sup = await Supplier.findById(supplierId).select("commissionRate");
    if (!sup) continue;
    const commission = Math.round(gross * (sup.commissionRate / 100));
    const res = await Payout.updateOne(
      { supplierId, orderId: order._id },
      { $setOnInsert: { orderNumber: order.orderNumber, gross, commission, amount: gross - commission, status: "pending" } },
      { upsert: true },
    );
    if (res.upsertedCount) await Supplier.updateOne({ _id: supplierId }, { $inc: { totalKgDiverted: kg } });
  }
}

export async function sendOrderConfirmation(order: IOrder) {
  const user = await User.findById(order.userId).select("name email").lean();
  if (!user) return;
  await sendEmail(
    user.email,
    `Order ${order.orderNumber} confirmed`,
    createElement(OrderConfirmationEmail, {
      name: user.name,
      orderNumber: order.orderNumber,
      items: order.items.map((i) => ({ title: i.title, lotNumber: i.lotNumber, qty: i.qty, price: i.price })),
      total: order.total,
      paymentMethod: order.paymentMethod,
      kgDiverted: order.kgDiverted,
      url: siteUrl(`/order/${order.orderNumber}`),
    }),
  );
}

export async function sendStatusEmail(order: IOrder, note?: string) {
  const user = await User.findById(order.userId).select("name email").lean();
  if (!user) return;
  await sendEmail(
    user.email,
    `Order ${order.orderNumber}: ${order.orderStatus}`,
    createElement(OrderStatusEmail, {
      name: user.name,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      note,
      trackingNumber: order.trackingNumber,
      courier: order.courier,
      url: siteUrl(`/account/orders/${order.orderNumber}`),
    }),
  );
}

export async function clearUserCart(userId: string) {
  await Cart.updateOne({ userId }, { items: [] });
}

/** Marks an order paid exactly once (shared by the verify action and the optional webhook). */
export async function markOrderPaid(order: IOrder & { save: () => Promise<unknown> }, paymentId: string, by: string) {
  if (order.paymentStatus === "paid") return false; // idempotent
  const doc = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      orderStatus: order.orderStatus === "placed" ? "confirmed" : order.orderStatus,
      $push: { statusHistory: { status: "paid", note: `Razorpay payment ${paymentId}`, at: new Date(), by } },
    },
    { new: true },
  );
  if (!doc) return false;
  await recordCouponUse(doc.couponCode, doc.userId.toString());
  await createPayouts(doc);
  await clearUserCart(doc.userId.toString());
  await sendOrderConfirmation(doc);
  return true;
}
