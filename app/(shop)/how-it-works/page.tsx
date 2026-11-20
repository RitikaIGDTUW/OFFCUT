import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  ["01", "Factories submit off-cuts", "Suppliers upload photos, approximate size and quantity through the supplier portal. We review within two working days and send an offer."],
  ["02", "We collect and grade", "Accepted material is picked up and brought to our grading bay. Each piece is measured to the millimetre, weighed, graded A/B/C and photographed."],
  ["03", "Every lot gets a number", "Lots receive a permanent lot number (e.g. LOT #A-0417) and a spec sheet: dimensions, thickness, weight, grade, finish, origin and certifications."],
  ["04", "You filter by real specs", "Search by material, alloy or grade, and filter by minimum length, width, thickness and weight — so you only see pieces that fit your project."],
  ["05", "Pay and receive", "Pay online with Razorpay (test mode in this demo) or Cash on Delivery. We pack, ship and email you tracking."],
  ["06", "Impact is counted", "Every order shows the kilograms diverted from landfill. Suppliers receive an ESG certificate for everything they've diverted."],
];

export default function HowItWorksPage() {
  return (
    <ProsePage eyebrow="Process" title={<>From factory floor to <em>your bench.</em></>}>
      <ol className="border-t border-ink">
        {STEPS.map(([n, t, d]) => (
          <li key={n} className="grid gap-4 border-b border-ink py-8 md:grid-cols-[120px_1fr]">
            <span className="font-mono text-5xl text-signal">{n}</span>
            <div>
              <h2 className="!mt-0 text-3xl">{t}</h2>
              <p className="mt-2 text-graphite">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="signal">
          <Link href="/shop">Browse lots</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/suppliers">I&apos;m a factory</Link>
        </Button>
      </div>
    </ProsePage>
  );
}
