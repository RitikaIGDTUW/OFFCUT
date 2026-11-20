import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Shipping & returns" };

export default async function ShippingPage() {
  const s = await getSettings();
  const sh = s.shipping;
  return (
    <ProsePage eyebrow="Help" title={<>Shipping &amp; <em>returns</em></>}>
      <h2>Shipping</h2>
      <ul>
        {sh.mode === "free-above" ? <li>Free standard shipping on orders over {formatINR(sh.freeAbove)}; otherwise {formatINR(sh.flatRate)}.</li> : null}
        {sh.mode === "flat" ? <li>Flat standard shipping: {formatINR(sh.flatRate)} per order.</li> : null}
        {sh.mode === "per-kg" ? <li>Shipping is charged at {formatINR(sh.perKgRate)} per kg (minimum {formatINR(sh.flatRate)}).</li> : null}
        <li>Express delivery (1–3 working days): +{formatINR(sh.expressSurcharge)}.</li>
        <li>Standard delivery takes 3–6 working days depending on your PIN code. Tracking is emailed when your order ships.</li>
        <li>GST at {s.taxRate}% is shown separately at checkout.</li>
      </ul>
      <h2>Returns</h2>
      <ul>
        <li>If a lot doesn&apos;t match its listing (dimensions, grade or condition), request a return within 7 days of delivery from your order page.</li>
        <li>Material that has been cut, glued, finished or otherwise worked cannot be returned.</li>
        <li>Refunds go back to the original payment method (Razorpay) or by bank transfer for COD orders, within 5–7 working days of the return reaching us.</li>
      </ul>
      <h2>Cancellations</h2>
      <p>You can request cancellation until your order is packed. Online payments are refunded in full.</p>
    </ProsePage>
  );
}
