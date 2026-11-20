import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { Accordion } from "@/components/ui/overlay";
import { getSettings } from "@/lib/settings";
import { DEFAULT_FAQ } from "@/lib/content";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const s = await getSettings();
  const items = s.faq?.length ? s.faq : DEFAULT_FAQ;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <ProsePage eyebrow="Help" title={<>Questions, <em>answered.</em></>}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Accordion items={items} />
    </ProsePage>
  );
}
