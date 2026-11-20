/** Minimal typings for Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js). */
export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (res: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
};

export type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (res: { error: { description?: string; reason?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}
