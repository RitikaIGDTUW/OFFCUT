import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import "@/models/Category";
import { escapeRegex, formatDims, formatINR, plain, sp } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import type { LotCard as LotCardT } from "@/lib/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = sp((await searchParams).q);
  return { title: q ? `Search: ${q}` : "Search", robots: { index: false } };
}

/** Wraps every query word found in `text` with <mark>. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        // split() with a capture group puts the matched words at odd indexes
        i % 2 === 1 ? (
          <mark key={i} className="bg-copper/30 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const stripHtml = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default async function SearchPage({ searchParams }: Props) {
  const q = (sp((await searchParams).q) ?? "").trim().slice(0, 100);
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  let results: (LotCardT & { description: string })[] = [];

  if (q) {
    await dbConnect();
    const select = "lotNumber title slug description grade gradeDetail condition dimensions weightKg unitType sellByWeight price compareAtRetailPrice discountPct images quantityAvailable status materialType categoryId";
    // 1) MongoDB full-text search ranked by relevance score
    let docs = await Product.find({ $text: { $search: q }, status: { $in: ["active", "sold-out"] } }, { score: { $meta: "textScore" } })
      .select(select)
      .populate("categoryId", "name slug")
      .sort({ score: { $meta: "textScore" } })
      .limit(48)
      .lean();
    // 2) Fallback: partial-word match (text search needs whole words, e.g. "alum" wouldn't match)
    if (!docs.length) {
      const re = new RegExp(escapeRegex(q), "i");
      docs = await Product.find({ status: { $in: ["active", "sold-out"] }, $or: [{ title: re }, { materialType: re }, { gradeDetail: re }, { tags: re }] })
        .select(select)
        .populate("categoryId", "name slug")
        .limit(48)
        .lean();
    }
    results = plain(docs) as unknown as (LotCardT & { description: string })[];
  }

  return (
    <div className="container-x py-12">
      <PageHeader eyebrow="Search the floor" title={q ? <>Results for “<em>{q}</em>”</> : <>Search <em>lots</em></>}>
        Search by material, grade, alloy, finish or size — e.g. “6061”, “veg-tan”, “walnut 25mm”.
      </PageHeader>

      <form action="/search" className="mb-10 flex max-w-2xl border border-ink">
        <label htmlFor="sq" className="sr-only">
          Search
        </label>
        <input id="sq" name="q" defaultValue={q} placeholder="Material, grade or size…" className="h-12 flex-1 bg-transparent px-4 focus:outline-none" />
        <button className="spec border-l border-ink bg-ink px-5 text-xs text-paper">Search</button>
      </form>

      {q && results.length === 0 ? (
        <EmptyState code="Ø" title="Not on the floor — yet.">
          Nothing matches “{q}”. Post a Material Wanted request and we&apos;ll notify you when a matching lot comes in.
          <div className="mt-4">
            <Button asChild variant="signal">
              <Link href={`/account/requests?material=${encodeURIComponent(q)}`}>Post a Material Wanted request</Link>
            </Button>
          </div>
        </EmptyState>
      ) : null}

      {results.length ? (
        <>
          <p className="spec mb-4 text-[11px] text-graphite">{results.length} lots</p>
          <ul className="divide-y divide-rule border-y border-ink">
            {results.map((r) => (
              <li key={r._id}>
                <Link href={`/lot/${r.slug}`} className="grid grid-cols-[80px_1fr] gap-4 py-4 hover:bg-paper-2 sm:grid-cols-[120px_1fr_auto]">
                  <span className="relative aspect-square border border-ink">
                    {r.images[0] ? <SafeImage src={r.images[0].url} alt="" fill sizes="120px" className="object-cover" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="spec block text-[10px] text-graphite">
                      LOT #{r.lotNumber} · {r.categoryId?.name} · GRADE {r.grade}
                      {r.gradeDetail ? ` · ${r.gradeDetail}` : ""}
                    </span>
                    <span className="mt-1 block text-lg font-medium">
                      <Highlight text={r.title} terms={terms} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-graphite">
                      <Highlight text={stripHtml(r.description).slice(0, 220)} terms={terms} />
                    </span>
                    <span className="spec mt-1 block text-[10px]">{formatDims(r.dimensions)}</span>
                  </span>
                  <span className="col-start-2 font-mono text-lg sm:col-start-3 sm:text-right">
                    {formatINR(r.price)}
                    {r.discountPct ? <span className="block text-xs text-signal">−{r.discountPct}% retail</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
