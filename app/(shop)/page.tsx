import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import { getCategories, getImpactStats, getLots } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { AUDIENCE_IMAGES, HERO_IMAGES, STORY_IMAGES } from "@/lib/seed-images";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { LotCard } from "@/components/shop/lot-card";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { cn, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { absolute: s.seo.title }, description: s.seo.description };
}

export default async function HomePage() {
  const [settings, stats, categories, fresh] = await Promise.all([
    getSettings(),
    getImpactStats(),
    getCategories(),
    getLots({}, { createdAt: -1 }, 10),
  ]);
  const heroImgs = settings.hero.images?.length ? settings.hero.images : HERO_IMAGES;
  const topCats = categories.filter((c) => !c.parent);
  const [titleA, titleB] = splitTitle(settings.hero.title);

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="relative border-b border-ink">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="container-x relative grid gap-10 py-12 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <Eyebrow index="00">{settings.hero.eyebrow}</Eyebrow>
            <h1 className="mt-6 text-hero">
              {titleA}
              <br />
              <em className="text-signal">{titleB}</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-graphite">{settings.hero.subtitle}</p>
            <form action="/search" role="search" className="mt-8 flex max-w-xl border border-ink bg-paper">
              <label htmlFor="hero-q" className="sr-only">
                Search by material, grade or size
              </label>
              <Search className="ml-4 mt-4 shrink-0 text-graphite" size={18} aria-hidden />
              <input
                id="hero-q"
                name="q"
                placeholder="Search by material, grade or size — e.g. “6061 plate”"
                className="h-14 min-w-0 flex-1 bg-transparent px-3 text-base placeholder:text-graphite/70 focus:outline-none"
              />
              <button className="spec border-l border-ink bg-ink px-5 text-xs text-paper hover:bg-signal hover:text-signal-ink">Search</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Veg-tan leather", "6061-T6", "Walnut", "Gore-Tex", "Carrara"].map((q) => (
                <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="spec border border-rule px-2 py-1 text-[10px] text-graphite hover:border-ink hover:text-ink">
                  {q}
                </Link>
              ))}
            </div>
          </div>
          {/* Photo collage with registration marks */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            {heroImgs.slice(0, 4).map((src, i) => (
              <div key={src} className={cn("reg-marks relative border border-ink", i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square", i === 3 && "hidden sm:block")}>
                <SafeImage src={src} alt={["Stack of leather off-cuts", "Brushed aluminium surface", "Rolls of fabric", "Hardwood plank grain"][i] ?? "Material sample"} fill priority={i === 0} sizes="(min-width:1024px) 40vw, 90vw" className="object-cover" />
                <span className="spec absolute left-2 top-2 bg-paper px-1 text-[9px]">FIG. {String(i + 1).padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── LIVE STATS BENTO ───────── */}
      <section className="container-x py-16" aria-labelledby="stats-h">
        <h2 id="stats-h" className="sr-only">
          Impact so far
        </h2>
        <div className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Kg diverted from landfill", value: formatNumber(stats.kgDiverted), tone: "moss" },
            { label: "Kg CO₂e avoided (est.)", value: formatNumber(stats.co2SavedKg), tone: "moss" },
            { label: "Lots sold", value: formatNumber(stats.lotsSold) },
            { label: "Partner factories", value: formatNumber(stats.partnerFactories) },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05} className="bg-paper p-6">
              <p className="spec text-[10px] text-graphite">{s.label}</p>
              <p className={cn("mt-4 font-mono text-4xl lg:text-5xl", s.tone === "moss" && "text-moss")}>{s.value}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── CATEGORIES BENTO ───────── */}
      <section className="container-x pb-16" aria-labelledby="cat-h">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Eyebrow index="01">Shop by material</Eyebrow>
            <h2 id="cat-h" className="mt-3 text-5xl leading-none md:text-6xl">
              The materials <em>library</em>
            </h2>
          </div>
          <Link href="/shop" className="spec hidden text-xs underline decoration-signal underline-offset-4 sm:block">
            All {formatNumber(stats.liveLots)} lots →
          </Link>
        </div>
        <ul className="grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-4">
          {topCats.map((c, i) => (
            <li key={c._id} className={cn(i === 0 && "col-span-2 row-span-2", i === 3 && "md:col-span-2")}>
              <Link href={`/shop/${c.slug}`} className="group relative block h-full overflow-hidden border border-ink">
                {c.image?.url ? (
                  <SafeImage src={c.image.url} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-paper">
                  <span className={cn("font-display leading-none", i === 0 ? "text-4xl md:text-5xl" : "text-2xl")}>{c.name}</span>
                  <span className="spec bg-paper px-1.5 py-0.5 text-[10px] text-ink">{c.count} lots</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── FRESH OFF THE FLOOR ───────── */}
      <section className="border-y border-ink bg-paper-2 py-16" aria-labelledby="fresh-h">
        <div className="container-x">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <Eyebrow index="02">Newest lots</Eyebrow>
              <h2 id="fresh-h" className="mt-3 text-5xl leading-none md:text-6xl">
                Fresh off the <em>floor</em>
              </h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/shop?sort=newest">
                See all <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
          <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" aria-label="Newest lots carousel">
            {fresh.map((l) => (
              <li key={l._id} className="w-[270px] shrink-0 snap-start">
                <LotCard lot={l} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="container-x py-20" aria-labelledby="how-h">
        <Eyebrow index="03">How it works</Eyebrow>
        <h2 id="how-h" className="mt-3 max-w-3xl text-5xl leading-none md:text-6xl">
          From the factory floor to <em>your bench</em>
        </h2>
        <div className="barcode mt-10" aria-hidden />
        <ol className="grid border-x border-b border-ink md:grid-cols-3">
          {[
            ["Factory", "Tanneries, mills and machine shops send us off-cuts that are too small for their corporate buyers — saving them disposal fees."],
            ["We grade & measure", "Every lot is weighed, measured to the millimetre, graded A/B/C, photographed and given a lot number."],
            ["You build", "Filter by exact size and spec, buy just what you need, and know exactly how much landfill you saved."],
          ].map(([t, d], i) => (
            <li key={t} className={cn("p-8", i > 0 && "border-t border-ink md:border-l md:border-t-0")}>
              <span className="font-mono text-6xl text-signal">0{i + 1}</span>
              <h3 className="mt-6 text-3xl">{t}</h3>
              <p className="mt-3 text-graphite">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── WHO IT'S FOR ───────── */}
      <section className="container-x pb-20" aria-labelledby="who-h">
        <Eyebrow index="04">Who it&apos;s for</Eyebrow>
        <h2 id="who-h" className="mt-3 text-5xl leading-none md:text-6xl">
          People who <em>make</em> things
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Makers", "Leatherworkers, jewellers and furniture builders who need premium stock in small quantities.", AUDIENCE_IMAGES.makers, "/shop/leather"],
            ["Students", "Architecture and design students building models on a hostel budget.", AUDIENCE_IMAGES.students, "/shop/plastics-acrylic"],
            ["Tailors", "Custom tailors sourcing technical and luxury fabric for one-off pieces.", AUDIENCE_IMAGES.tailors, "/shop/textiles"],
            ["Architects", "Studios prototyping with real marble, metal and timber samples.", AUDIENCE_IMAGES.architects, "/shop/stone-marble"],
          ].map(([t, d, src, href]) => (
            <li key={t}>
              <Link href={href} className="group block border border-ink">
                <div className="relative aspect-[4/5] overflow-hidden border-b border-ink">
                  <SafeImage src={src} alt={`${t} at work`} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0" />
                </div>
                <div className="p-4">
                  <h3 className="text-3xl">{t}</h3>
                  <p className="mt-2 text-sm text-graphite">{d}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── SUPPLIER STORY ───────── */}
      <section className="border-y border-ink" aria-labelledby="story-h">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[320px] border-b border-ink lg:border-b-0 lg:border-r">
            <SafeImage src={STORY_IMAGES.mill} alt="Looms running in a textile mill" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-8 lg:p-16">
            <Eyebrow index="05">Featured supplier</Eyebrow>
            <h2 id="story-h" className="mt-4 text-5xl leading-none">
              “We used to <em>pay</em> to throw this away.”
            </h2>
            <p className="mt-6 text-graphite">
              A technical-textile mill in Tiruppur produces roll-ends of waterproof membrane fabric every week — too short for their
              outdoor-brand clients. They used to bale and landfill them. Now OFFCUT collects them every fortnight, grades each roll,
              and sells them to tailors and gear-makers. The mill gets paid instead of paying disposal fees, and receives an ESG
              certificate for every kilogram diverted.
            </p>
            <p className="spec mt-4 text-[10px] text-graphite">Illustrative story · supplier names are anonymised by default</p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/suppliers">Sell your off-cuts →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────── SUSTAINABILITY BAND ───────── */}
      <section className="bg-moss py-16 text-paper" aria-labelledby="sus-h">
        <div className="container-x grid items-center gap-8 lg:grid-cols-12">
          <h2 id="sus-h" className="text-5xl leading-none lg:col-span-7 md:text-7xl">
            {formatNumber(stats.kgDiverted / 1000, 1)} tonnes <em>not</em> in landfill.
          </h2>
          <div className="lg:col-span-5">
            <p className="text-paper/85">
              Every lot page tells you exactly how many kilograms you are diverting and an estimate of the CO₂e avoided by not producing
              that material new.
            </p>
            <Link href="/sustainability" className="spec mt-6 inline-block border border-paper px-4 py-3 text-xs hover:bg-paper hover:text-moss">
              How we measure impact →
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS (sample content) ───────── */}
      <section className="container-x py-20" aria-labelledby="t-h">
        <Eyebrow index="06">From the bench</Eyebrow>
        <h2 id="t-h" className="mt-3 text-5xl leading-none">
          What makers say <span className="spec align-middle text-xs text-graphite">[sample content]</span>
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Bought two bundles of veg-tan strips for watch straps. Exactly the size the listing said — to the millimetre.", "Leather maker, Jaipur"],
            ["Our thesis model used real Carrara off-cuts instead of foam board. The jury noticed.", "Architecture student, Ahmedabad"],
            ["Gore-Tex roll ends at a third of retail let me prototype a whole rain-jacket line.", "Independent tailor, Bengaluru"],
          ].map(([q, who]) => (
            <li key={who} className="border border-ink bg-paper-2 p-6">
              <p className="font-display text-2xl leading-snug">“{q}”</p>
              <p className="spec mt-6 text-[10px] text-graphite">— {who} · sample testimonial</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── NEWSLETTER ───────── */}
      <section className="container-x" aria-labelledby="nl-h">
        <div className="grid items-center gap-6 border border-ink p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 id="nl-h" className="text-4xl leading-none md:text-5xl">
              The Friday <em>drop</em> list
            </h2>
            <p className="mt-3 text-graphite">New lots go out by email before they hit the shop. One email a week, no spam.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}

/** Splits "Industrial-grade leftovers. Maker-grade prices." into two lines; second is italic orange. */
function splitTitle(title: string): [string, string] {
  const idx = title.indexOf(". ");
  if (idx === -1) return [title, ""];
  return [title.slice(0, idx + 1), title.slice(idx + 2)];
}
