import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/shop/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <ProsePage eyebrow="Contact" title={<>Talk to a <em>human.</em></>} intro="Questions about a lot, bulk enquiries, or a factory with off-cuts to sell — we reply within one working day.">
      <div className="grid gap-10 md:grid-cols-[1fr_240px]">
        <ContactForm />
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="spec text-[10px] text-graphite">Email</dt>
            <dd>{s.contact.email}</dd>
          </div>
          <div>
            <dt className="spec text-[10px] text-graphite">Phone</dt>
            <dd>{s.contact.phone}</dd>
          </div>
          <div>
            <dt className="spec text-[10px] text-graphite">Grading bay</dt>
            <dd>{s.contact.address}</dd>
          </div>
        </dl>
      </div>
    </ProsePage>
  );
}
