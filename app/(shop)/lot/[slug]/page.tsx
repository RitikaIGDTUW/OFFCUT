import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Leaf, Star } from "lucide-react";
import { getLotBySlug, getLotExtras, bumpViews } from "@/lib/lot";
import { getSessionUser } from "@/lib/guards";
import { env } from "@/lib/env";
import { formatDate, formatDims, formatINR, fmtLen } from "@/lib/utils";
import { CONDITION_LABEL } from "@/lib/constants";
import { Gallery } from "@/components/shop/lot/gallery";
import { SpecSheet, WillItFit } from "@/components/shop/lot/spec-tools";
import { BuyBox } from "@/components/shop/lot/buy-box";
import { ReviewForm } from "@/components/shop/lot/review-form";
import { LotGrid } from "@/components/shop/lot-card";
import { Badge, Eyebrow } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lot = await getLotBySlug((await params).slug);
  if (!lot) return { title: "Lot not found" };
  const desc = `LOT #${lot.lotNumber} · ${formatDims(lot.dimensions)} · Grade ${lot.grade}${lot.gradeDetail ? ` (${lot.gradeDetail})` : ""} · ${formatINR(lot.price)}`;
  return {
    title: lot.title,
    description: desc,
    openGraph: { title: lot.title, description: desc },
    alternates: { canonical: `/lot/${lot.slug}` },
  };
}

export default async function LotPage({ params }: Props) {
  const { slug } = await params;
  const lot = await getLotBySlug(slug);
  if (!lot) notFound();
  const user = await getSessionUser();
  const extras = await getLotExtras(lot._id, lot.categoryId, user?.id);
  void bumpViews(lot._id);

  const unitLabel = lot.sellByWeight ? "kg" : lot.unitType;
  const pricePerKg = !lot.sellByWeight && lot.weightKg > 0 ? lot.price / lot.weightKg : null;
  const soldOut = lot.status === "sold-out" || lot.quantityAvailable <= 0;

  // JSON-LD Product schema for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lot.title,
    sku: lot.lotNumber,
    image: lot.images.map((i) => i.url),
    description: lot.description.replace(/<[^>]+>/g, " ").slice(0, 500),
    material: lot.materialType,
    category: lot.category?.name,
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: lot.price,
      availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: `${env.SITE_URL}/lot/${lot.slug}`,
    },
    ...(extras.rating.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: extras.rating.avg, reviewCount: extras.rating.count } } : {}),
  };

  return (
    <div className="pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x py-8">
        <nav className="spec mb-6 text-[10px] text-graphite" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:underline">
            Catalogue
          </Link>
          {" / "}
          {lot.category ? (
            <Link href={`/shop/${lot.category.slug}`} className="hover:underline">
              {lot.category.name}
            </Link>
          ) : null}
          {" / "}LOT #{lot.lotNumber}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <Gallery images={lot.images} title={lot.title} lotNumber={lot.lotNumber} />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="spec border-2 border-ink px-2 py-1 text-xs font-bold">LOT #{lot.lotNumber}</span>
              <span className="spec -rotate-2 border-2 border-signal px-2 py-1 text-xs font-bold text-signal">
                GRADE {lot.grade}
                {lot.gradeDetail ? ` · ${lot.gradeDetail}` : ""}
              </span>
              <Badge>{CONDITION_LABEL[lot.condition]}</Badge>
              {soldOut ? <Badge tone="ink">Sold out</Badge> : <Badge tone="moss">In stock</Badge>}
            </div>
            <h1 className="mt-4 text-4xl leading-[1.02] md:text-5xl">{lot.title}</h1>
            {extras.rating.count ? (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-1 text-sm">
                <Star size={14} className="fill-signal" /> {extras.rating.avg} · {extras.rating.count} review{extras.rating.count > 1 ? "s" : ""}
              </a>
            ) : null}
            <p className="spec mt-3 text-[11px] text-graphite">
              {formatDims(lot.dimensions)}
              {lot.isRoll && lot.rollLength ? ` · ROLL ${fmtLen(lot.rollLength)} M` : ""}
              {!lot.sellByWeight && lot.weightKg ? ` · ${fmtLen(lot.weightKg, 2)} KG` : ""}
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-4 border-y border-ink py-5">
              <div>
                <p className="font-mono text-4xl leading-none">
                  {formatINR(lot.price)}
                  <span className="text-base text-graphite">/{unitLabel}</span>
                </p>
                {pricePerKg ? <p className="spec mt-2 text-[11px] text-graphite">≈ {formatINR(pricePerKg)} per kg</p> : null}
              </div>
              {lot.compareAtRetailPrice && lot.compareAtRetailPrice > lot.price ? (
                <div className="text-sm">
                  <p className="font-mono text-graphite line-through">{formatINR(lot.compareAtRetailPrice)} retail</p>
                  <p className="spec mt-1 inline-block border border-ink bg-signal px-2 py-1 text-xs font-bold text-signal-ink">
                    {lot.discountPct}% below retail
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <BuyBox
                inWishlist={extras.inWishlist}
                item={{
                  productId: lot._id,
                  slug: lot.slug,
                  title: lot.title,
                  lotNumber: lot.lotNumber,
                  image: lot.images[0]?.url,
                  price: lot.price,
                  max: lot.quantityAvailable,
                  unitType: lot.unitType,
                  sellByWeight: lot.sellByWeight,
                  weightKg: lot.weightKg,
                  specs: formatDims(lot.dimensions),
                }}
              />
            </div>

            {/* Sustainability card */}
            <div className="mt-6 flex gap-4 border border-moss bg-moss/10 p-4">
              <Leaf className="mt-1 shrink-0 text-moss" size={20} aria-hidden />
              <div className="text-sm">
                <p className="font-medium text-moss">
                  Buying one {unitLabel} diverts {fmtLen(lot.sellByWeight ? 1 : lot.weightKg, 2)} kg from landfill.
                </p>
                <p className="mt-1 text-graphite">
                  This whole lot: {fmtLen(lot.sustainability.kgDiverted, 1)} kg diverted · ≈ {fmtLen(lot.sustainability.co2SavedKg, 1)} kg CO₂e avoided vs.
                  new material (estimate).
                </p>
              </div>
            </div>

            {lot.supplier ? (
              <p className="spec mt-4 text-[10px] text-graphite">
                Sourced from: {lot.supplier.name ?? `a verified ${lot.supplier.industry.toLowerCase()} partner`}
                {lot.origin ? ` · ${lot.origin}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-10">
            <section aria-labelledby="desc-h">
              <Eyebrow index="A">About this lot</Eyebrow>
              <h2 id="desc-h" className="sr-only">
                Description
              </h2>
              <div className="prose-offcut mt-4 max-w-2xl" dangerouslySetInnerHTML={{ __html: lot.description }} />
            </section>
            <SpecSheet
              dims={lot.dimensions}
              isRoll={lot.isRoll}
              rollLength={lot.rollLength}
              rows={[
                ["Material", lot.materialType],
                ["Grade", `${lot.grade}${lot.gradeDetail ? ` · ${lot.gradeDetail}` : ""}`],
                ["Condition", lot.condition],
                ["Weight / unit", lot.sellByWeight ? "Sold per kg" : `${fmtLen(lot.weightKg, 2)} kg`],
                ["Sold as", lot.sellByWeight ? "kg" : lot.unitType],
                ["Colour", lot.colour],
                ["Finish", lot.finish],
                ["Origin", lot.origin],
                ["Certifications", lot.certifications.join(", ")],
                ["Tags", lot.tags.join(", ")],
              ]}
            />
            {lot.specSheetPdf?.url ? (
              <a href={lot.specSheetPdf.url} target="_blank" rel="noreferrer" className="spec inline-flex items-center gap-2 border border-ink px-4 py-3 text-xs hover:bg-ink hover:text-paper">
                <Download size={14} /> Download spec sheet (PDF)
              </a>
            ) : null}
          </div>
          <aside>
            <WillItFit dims={lot.dimensions} isRoll={lot.isRoll} rollLength={lot.rollLength} qty={lot.quantityAvailable} unitLabel={unitLabel} />
          </aside>
        </div>

        {/* Reviews */}
        <section id="reviews" className="mt-16 border-t border-ink pt-10" aria-labelledby="rev-h">
          <h2 id="rev-h" className="text-4xl">
            Reviews {extras.rating.count ? <span className="font-mono text-xl text-graphite">({extras.rating.avg}/5)</span> : null}
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
            <ul className="space-y-6">
              {extras.reviews.length === 0 ? <li className="text-graphite">No reviews yet.</li> : null}
              {extras.reviews.map((r) => (
                <li key={r._id} className="border-b border-rule pb-6">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < r.rating ? "fill-signal text-ink" : "text-rule"} aria-hidden />
                    ))}
                    <span className="sr-only">{r.rating} out of 5</span>
                    {r.verifiedPurchase ? <Badge tone="moss">Verified buyer</Badge> : null}
                  </div>
                  <p className="mt-2 font-medium">{r.title}</p>
                  <p className="mt-1 text-sm text-graphite">{r.body}</p>
                  {r.photos.length ? (
                    <div className="mt-3 flex gap-2">
                      {r.photos.map((p) => (
                        <span key={p.url} className="relative h-20 w-20 border border-ink">
                          <SafeImage src={p.url} alt="Buyer photo" fill sizes="80px" className="object-cover" />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="spec mt-2 text-[10px] text-graphite">
                    {r.userName} · {formatDate(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
            <div>
              {!user ? (
                <p className="border border-ink p-5 text-sm">
                  <Link href={`/login?callbackUrl=/lot/${lot.slug}`} className="underline">
                    Sign in
                  </Link>{" "}
                  to review this lot.
                </p>
              ) : extras.hasReviewed ? (
                <p className="border border-ink p-5 text-sm text-graphite">You&apos;ve already reviewed this lot.</p>
              ) : (
                <ReviewForm productId={lot._id} canAddPhotos={extras.hasPurchased} />
              )}
            </div>
          </div>
        </section>

        {extras.related.length ? (
          <section className="mt-16 border-t border-ink pt-10" aria-labelledby="rel-h">
            <h2 id="rel-h" className="mb-6 text-4xl">
              Related <em>lots</em>
            </h2>
            <LotGrid lots={extras.related} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
