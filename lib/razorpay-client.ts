"use client";
import type { RazorpaySuccess } from "@/types/razorpay";
import type { RazorpayParams } from "@/actions/checkout";

/** Loads checkout.js once. */
function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout. Resolves with the success payload, or `null` if the buyer closed
 * the popup / the payment failed (the order then stays "pending" and can be retried).
 */
export async function openRazorpay(p: RazorpayParams, onFailure: (reason: string) => void): Promise<RazorpaySuccess | null> {
  const ok = await loadScript();
  if (!ok || !window.Razorpay) {
    onFailure("Could not load Razorpay (are you offline?)");
    return null;
  }
  const Razorpay = window.Razorpay;
  return new Promise((resolve) => {
    let settled = false;
    const rz = new Razorpay({
      key: p.key,
      amount: p.amount,
      currency: "INR",
      name: "OFFCUT",
      description: `Order ${p.orderNumber} (TEST MODE)`,
      order_id: p.orderId,
      prefill: { name: p.name, email: p.email, contact: p.contact },
      notes: { orderNumber: p.orderNumber },
      theme: { color: "#FF5B1F" },
      handler: (res) => {
        settled = true;
        resolve(res);
      },
      modal: {
        ondismiss: () => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        },
      },
    });
    rz.on("payment.failed", (r) => onFailure(r.error.description ?? r.error.reason ?? "Payment failed"));
    rz.open();
  });
}
