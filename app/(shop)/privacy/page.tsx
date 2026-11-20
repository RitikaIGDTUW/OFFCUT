import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title={<>Privacy <em>policy</em></>}>
      <h2>What we store</h2>
      <ul>
        <li>Account details: name, email, a bcrypt hash of your password (never the password itself), phone and saved addresses.</li>
        <li>Orders: items, delivery address and payment status. Card/UPI details are handled by Razorpay and never reach our servers.</li>
        <li>Uploaded files (avatars, review photos, supplier documents) are stored on UploadThing.</li>
        <li>Suppliers: company details, GSTIN, documents and payout details — visible only to the supplier and administrators.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To process orders, send transactional emails (order updates, password resets) and, if you subscribe, the weekly drop list. We don&apos;t sell personal data.</p>
      <h2>Cookies</h2>
      <p>We use a single session cookie for sign-in, and your browser&apos;s local storage to remember your cart and light/dark preference.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile and addresses at any time, and ask us to delete your account from the contact page.</p>
    </ProsePage>
  );
}
