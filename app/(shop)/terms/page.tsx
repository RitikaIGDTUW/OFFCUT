import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title={<>Terms of <em>use</em></>} intro="Plain-language terms for this college-project demo store.">
      <h2>1. About this site</h2>
      <p>OFFCUT is a student project demonstrating an e-commerce marketplace. No real goods are sold and no real payments are taken — Razorpay runs in test mode.</p>
      <h2>2. Listings</h2>
      <p>Lot descriptions, dimensions and grades are provided in good faith. Natural materials (leather, wood, stone) vary; tolerances are stated in the FAQ.</p>
      <h2>3. Orders &amp; pricing</h2>
      <p>Prices and stock are confirmed on our server at checkout. We may cancel an order if a lot becomes unavailable or was listed at an obviously wrong price, and will refund any payment in full.</p>
      <h2>4. Suppliers</h2>
      <p>Suppliers confirm they own the material they submit and that it is safe and legal to resell. Offers are valid for 14 days. Payouts are made after the buyer&apos;s order is paid, minus the agreed commission.</p>
      <h2>5. Reviews</h2>
      <p>Reviews are moderated. We remove reviews that are abusive, off-topic or include personal information.</p>
      <h2>6. Liability</h2>
      <p>Off-cuts are sold as raw materials. Buyers are responsible for using appropriate tools and safety equipment when working them.</p>
    </ProsePage>
  );
}
