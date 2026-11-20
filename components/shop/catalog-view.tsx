import Link from "next/link";
import { Suspense } from "react";
import { getCatalog, getCategories, getFacets, SORTS, type SearchParams } from "@/lib/catalog";
import { sp, formatINR, formatDims, fmtLen } from "@/lib/utils";
import { CONDITION_LABEL } from "@/lib/constants";
import { LotGrid } from "./lot-card";
import { FilterPanel, MobileFilters, SortAndView } from "./filters";
import { EmptyState, Table } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";

/** Shared body of /shop and /shop/[category]: sidebar filters + results grid or spec table. */
export async function CatalogView({ searchParams, categorySlug }: { searchParams: SearchParams; categorySlug?: string }) {
  const [{ items, total, page, pages, category }, facets, categories] = await Promise.all([
    getCatalog(searchParams, categorySlug),
    getFacets(),
    getCategories(),
  ]);
  const view = sp(searchParams.view) === "list" ? "list" : "grid";
  const cats = categories.map((c) => ({ name: c.name, slug: c.slug, count: c.count }));
  const sorts = Object.entries(SORTS).map(([key, v]) => ({ key, label: v.label }));

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    return `?${q.toString()}`;
  };

  return (
    <>
      <section className="relative border-b border-ink">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="container-x relative py-10">
          <p className="spec text-[10px] text-graphite">
            <Link href="/shop" className="hover:underline">
              Catalogue
            </Link>
            {category ? ` / ${category.name}` : " / All lots"}
          </p>
          <h1 className="mt-3 text-6xl leading-none md:text-7xl">{category ? category.name : <>All <em>lots</em></>}</h1>
          {category?.description ? <p className="mt-3 max-w-2xl text-graphite">{category.description}</p> : null}
          <p className="spec mt-4 text-[11px]">{total} lots on the floor</p>
        </div>
      </section>

      <div className="container-x grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <Suspense>
            <FilterPanel facets={facets} categories={cats} activeCategory={category?.slug} />
          </Suspense>
        </aside>
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <Suspense>
              <MobileFilters facets={facets} categories={cats} activeCategory={category?.slug} />
            </Suspense>
            <p className="hidden font-mono text-xs text-graphite lg:block">
              Page {page} of {pages}
            </p>
            <Suspense>
              <SortAndView sorts={sorts} />
            </Suspense>
          </div>

          {items.length === 0 ? (
            <EmptyState code="404" title="No lots match.">
              Try widening the size range — or tell us what you need and we&apos;ll hunt for it.
              <div className="mt-4">
                <Button asChild variant="signal">
                  <Link href="/account/requests">Post a Material Wanted request</Link>
                </Button>
              </div>
            </EmptyState>
          ) : view === "grid" ? (
            <LotGrid lots={items} priorityCount={4} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Material</th>
                  <th>Dimensions</th>
                  <th>Weight</th>
                  <th>Grade</th>
                  <th>Condition</th>
                  <th>Stock</th>
                  <th className="text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l._id} className="hover:bg-paper-2">
                    <td>
                      <Link href={`/lot/${l.slug}`} className="flex items-center gap-3">
                        <span className="relative h-10 w-10 shrink-0 border border-ink">
                          {l.images[0] ? <SafeImage src={l.images[0].url} alt="" fill sizes="40px" className="object-cover" /> : null}
                        </span>
                        <span className="font-mono text-xs">#{l.lotNumber}</span>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/lot/${l.slug}`} className="font-medium hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs">{formatDims(l.dimensions)}</td>
                    <td className="font-mono text-xs">{l.sellByWeight ? "per kg" : `${fmtLen(l.weightKg, 2)} kg`}</td>
                    <td className="font-mono text-xs">
                      {l.grade}
                      {l.gradeDetail ? ` · ${l.gradeDetail}` : ""}
                    </td>
                    <td className="text-xs">{CONDITION_LABEL[l.condition]}</td>
                    <td className="font-mono text-xs">{l.quantityAvailable > 0 ? l.quantityAvailable : "—"}</td>
                    <td className="whitespace-nowrap text-right font-mono">
                      {formatINR(l.price)}
                      {l.discountPct ? <span className="ml-1 text-[10px] text-signal">−{l.discountPct}%</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {pages > 1 ? (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="spec border border-ink px-3 py-2 text-[11px]">
                  ← Prev
                </Link>
              ) : null}
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`border px-3 py-2 font-mono text-xs ${p === page ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}
                >
                  {p}
                </Link>
              ))}
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="spec border border-ink px-3 py-2 text-[11px]">
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
