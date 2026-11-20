import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";
import { env, features } from "./env";

/**
 * Razorpay — TEST MODE ONLY.
 * Flow:
 *  1. server: createRazorpayOrder()  → Razorpay order id
 *  2. browser: opens checkout.js with that id, buyer pays with a test card / success@razorpay
 *  3. browser → server action: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *  4. server: verifyPaymentSignature() recomputes HMAC-SHA256(order_id|payment_id, KEY_SECRET)
 *     and only then marks the order paid. No webhook needed (works on localhost).
 */
let client: Razorpay | null = null;
export function razorpay(): Razorpay | null {
  if (!features.razorpay) return null;
  if (!client) client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

export const isTestMode = () => env.RAZORPAY_KEY_ID.startsWith("rzp_test_");

export async function createRazorpayOrder(amountInr: number, receipt: string, notes: Record<string, string> = {}) {
  const rz = razorpay();
  if (!rz) throw new Error("Online payments are not configured. Choose Cash on Delivery.");
  const order = await rz.orders.create({
    amount: Math.round(amountInr * 100), // paise
    currency: "INR",
    receipt: receipt.slice(0, 40),
    notes,
  });
  return { id: order.id, amount: Number(order.amount), currency: order.currency };
}

/** Constant-time comparison of the expected and received signatures. */
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function refundPayment(paymentId: string, amountInr?: number) {
  const rz = razorpay();
  if (!rz) throw new Error("Razorpay is not configured.");
  const refund = await rz.payments.refund(paymentId, amountInr ? { amount: Math.round(amountInr * 100) } : {});
  return refund.id;
}
