import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { STORY_IMAGES } from "@/lib/seed-images";
import { getSessionUser } from "@/lib/guards";

export const metadata: Metadata = {
  title: "Sell your off-cuts",
  description: "Factories, mills and machine shops: turn off-cuts and dead-stock into revenue and ESG reporting.",
};

export default async function SuppliersLanding() {
  const user = await getSessionUser();
  const cta = !user ? "/register?as=supplier" : user.role === "buyer" ? "/contact" : "/supplier";
  return (
    <>
      <section className="relative border-b border-ink">
        <div className="grid lg:grid-cols-2">
          <div className="container-x py-16 lg:py-24">
            <Eyebrow>For factories, mills &amp; machine shops</Eyebrow>
            <h1 className="mt-5 text-hero">
              Your scrap is
              <br />
              <em className="text-signal">someone&apos;s stock.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-graphite">
              Stop paying to dispose of high-grade off-cuts. We collect, grade, list and ship them — you get paid and get an ESG
              certificate for every kilogram.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="signal" size="lg">
                <Link href={cta}>{user?.role === "buyer" ? "Contact us to become a supplier" : "Register as a supplier"}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
            {user?.role === "buyer" ? (
              <p className="mt-3 text-sm text-graphite">You&apos;re signed in with a buyer account — supplier accounts are registered separately.</p>
            ) : null}
          </div>
          <div className="relative min-h-[320px] border-t border-ink lg:border-l lg:border-t-0">
            <SafeImage src={STORY_IMAGES.machining} alt="A machine cutting a piece of metal" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>
      <section className="container-x py-20">
        <ul className="grid gap-px border border-ink bg-ink md:grid-cols-3">
          {[
            ["₹0", "Disposal fees", "We pick up from your floor. No baling, no landfill charges, no scrap-dealer haggling."],
            ["ESG", "Reporting built in", "Download a certificate of kilograms diverted and estimated CO₂e avoided — ready for your sustainability report."],
            ["T+7", "Payouts", "Get paid by bank transfer or UPI within 7 days of a lot selling, minus a transparent commission."],
          ].map(([big, t, d]) => (
            <li key={t} className="bg-paper p-8">
              <p className="font-mono text-5xl text-signal">{big}</p>
              <h2 className="mt-6 text-3xl">{t}</h2>
              <p className="mt-2 text-graphite">{d}</p>
            </li>
          ))}
        </ul>
        <h2 className="mt-20 text-5xl">
          What we <em>take</em>
        </h2>
        <p className="mt-4 max-w-2xl text-graphite">
          Leather (full-grain, veg-tan, chrome-tan), technical and luxury textiles, aluminium/steel/brass/copper plate and bar, hardwood and
          veneer, marble and granite remnants, acrylic and polycarbonate, carbon and glass fibre, cork and technical foams, glass, and
          hardware/trims. Minimum lot size: about 5 kg.
        </p>
        <ol className="mt-10 grid gap-5 md:grid-cols-4">
          {["Register & verify (GSTIN + documents)", "Submit photos & approximate sizes", "Accept our offer", "We collect, list & pay you"].map((s, i) => (
            <li key={s} className="border border-ink p-5">
              <span className="font-mono text-3xl">0{i + 1}</span>
              <p className="mt-3">{s}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
