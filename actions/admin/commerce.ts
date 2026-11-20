"use server";
import { createElement } from "react";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionError, assertAdmin } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { features } from "@/lib/env";
import { refundPayment } from "@/lib/razorpay";
import { createPayouts, restoreStock, sendStatusEmail } from "@/lib/orders";
import { sendEmail, siteUrl } from "@/lib/email";
import { objectId } from "@/lib/validations/common";
import { ORDER_STATUS, type OrderStatus } from "@/lib/constants";
import type { ActionResult } from "@/lib/utils";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Coupon, MaterialRequest, Payout, Review } from "@/models/misc";
import { MaterialMatchEmail } from "@/components/emails/templates";

/* ───────── Orders ───────── */
export async function updateOrderStatus(id: string, status: OrderStatus, note: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (!ORDER_STATUS.includes(status)) return { ok: false, error: "Unknown status." };
    const order = await Order.findById(objectId.parse(id));
    if (!order) return { ok: false, error: "Order not found." };
    const before = order.orderStatus;
    if (before === status) return { ok: false, error: `Order is already ${status}.` };
    order.orderStatus = status;
    order.statusHistory.push({ status, note: note.trim() || undefined, at: new Date(), by: admin.email });
    // Close any open buyer requests that this status change answers.
    if (status === "cancelled" && order.cancelRequest?.reason) order.cancelRequest.resolved = true;
    if (status === "returned" && order.returnRequest?.reason) order.returnRequest.resolved = true;
    // COD is "paid" when the courier collects the cash on delivery.
    if (status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus === "pending") order.paymentStatus = "paid";
    await order.save();

    if (status === "cancelled" || status === "returned") {
      await restoreStock(order);
      await Payout.deleteMany({ orderId: order._id, status: "pending" });
      revalidateTag("catalog");
    }
    if (order.paymentStatus === "paid") await createPayouts(order);
    await sendStatusEmail(order, note.trim() || undefined);
    await audit(admin, "order.status", "Order", id, { status: before }, { status, note });
    revalidateTag("orders");
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: `Order marked ${status} — customer emailed` };
  } catch (e) {
    return actionError(e);
  }
}

export async function setTracking(id: string, courier: string, trackingNumber: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const t = z.object({ courier: z.string().trim().min(2).max(40), trackingNumber: z.string().trim().min(4).max(40) }).parse({ courier, trackingNumber });
    const order = await Order.findById(objectId.parse(id));
    if (!order) return { ok: false, error: "Order not found." };
    order.courier = t.courier;
    order.trackingNumber = t.trackingNumber;
    if (["placed", "confirmed", "packed"].includes(order.orderStatus)) {
      order.orderStatus = "shipped";
      order.statusHistory.push({ status: "shipped", note: `${t.courier} ${t.trackingNumber}`, at: new Date(), by: admin.email });
    }
    await order.save();
    await sendStatusEmail(order, `Your order has shipped with ${t.courier}.`);
    await audit(admin, "order.tracking", "Order", id, undefined, t);
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Tracking saved & customer emailed" };
  } catch (e) {
    return actionError(e);
  }
}

/** Full refund through Razorpay's refund API (test mode). COD refunds are recorded manually. */
export async function refundOrder(id: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const order = await Order.findById(objectId.parse(id));
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus !== "paid") return { ok: false, error: "Only paid orders can be refunded." };
    let note = "Refund recorded (COD — pay back by bank transfer).";
    if (order.paymentMethod === "razorpay") {
      if (!features.razorpay || !order.razorpayPaymentId) return { ok: false, error: "Razorpay not configured or payment id missing." };
      order.razorpayRefundId = await refundPayment(order.razorpayPaymentId);
      note = `Razorpay refund ${order.razorpayRefundId}`;
    }
    order.paymentStatus = "refunded";
    if (!["cancelled", "returned"].includes(order.orderStatus)) order.orderStatus = order.orderStatus === "delivered" ? "returned" : "cancelled";
    order.statusHistory.push({ status: "refunded", note, at: new Date(), by: admin.email });
    await order.save();
    await restoreStock(order);
    await Payout.deleteMany({ orderId: order._id, status: "pending" });
    await sendStatusEmail(order, `A full refund of ₹${order.total} has been issued.`);
    await audit(admin, "order.refund", "Order", id, undefined, { note });
    revalidateTag("catalog");
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Refund issued" };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Reviews ───────── */
export async function moderateReview(id: string, action: "approve" | "reject" | "delete"): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const oid = objectId.parse(id);
    if (action === "delete") await Review.deleteOne({ _id: oid });
    else await Review.updateOne({ _id: oid }, { isApproved: action === "approve" });
    await audit(admin, `review.${action}`, "Review", id);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Coupons ───────── */
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, "3–20 letters/numbers"),
  description: z.string().trim().max(120).default(""),
  type: z.enum(["percent", "flat"]),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).default(0),
  maxUses: z.coerce.number().int().min(0).default(0),
  perUserLimit: z.coerce.number().int().min(0).default(1),
  startsAt: z.string().default(""),
  expiresAt: z.string().default(""),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.input<typeof couponSchema>;

export async function saveCoupon(input: unknown, id?: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const d = couponSchema.parse(input);
    if (d.type === "percent" && d.value > 90) return { ok: false, error: "Percent coupons are capped at 90%." };
    const data = { ...d, maxUses: d.maxUses || null, startsAt: d.startsAt ? new Date(d.startsAt) : null, expiresAt: d.expiresAt ? new Date(d.expiresAt) : null };
    if (id) await Coupon.updateOne({ _id: objectId.parse(id) }, data);
    else await Coupon.create(data);
    await audit(admin, id ? "coupon.update" : "coupon.create", "Coupon", id ?? d.code, undefined, data);
    revalidatePath("/admin/coupons");
    return { ok: true, message: "Coupon saved" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    await Coupon.deleteOne({ _id: objectId.parse(id) });
    await audit(admin, "coupon.delete", "Coupon", id);
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Material Wanted requests ───────── */
export async function matchRequest(id: string, lotNumbers: string, note: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const req = await MaterialRequest.findById(objectId.parse(id));
    if (!req) return { ok: false, error: "Request not found." };
    const nums = lotNumbers
      .split(/[,\s]+/)
      .map((s) => s.replace(/^#/, "").trim().toUpperCase())
      .filter(Boolean);
    const lots = await Product.find({ lotNumber: { $in: nums }, status: "active" }).select("title slug lotNumber").lean();
    if (!lots.length) return { ok: false, error: "No active lots found with those lot numbers (e.g. A-0012)." };
    req.matchedProductIds = lots.map((l) => l._id);
    req.status = "matched";
    req.adminNote = note.trim() || undefined;
    await req.save();
    const user = await User.findById(req.userId).select("name email").lean();
    if (user) {
      await sendEmail(
        user.email,
        "We found material for your request",
        createElement(MaterialMatchEmail, { name: user.name, material: req.material, note: note.trim() || undefined, lots: lots.map((l) => ({ title: `#${l.lotNumber} ${l.title}`, url: siteUrl(`/lot/${l.slug}`) })) }),
      );
    }
    await audit(admin, "request.match", "MaterialRequest", id, undefined, { lots: nums });
    revalidatePath("/admin/requests");
    return { ok: true, message: `Matched ${lots.length} lot(s) — buyer notified` };
  } catch (e) {
    return actionError(e);
  }
}

export async function closeRequest(id: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    await MaterialRequest.updateOne({ _id: objectId.parse(id) }, { status: "closed" });
    await audit(admin, "request.close", "MaterialRequest", id);
    revalidatePath("/admin/requests");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
