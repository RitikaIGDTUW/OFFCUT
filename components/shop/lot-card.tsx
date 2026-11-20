import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/primitives";
import { CATEGORY_TONE, CONDITION_LABEL } from "@/lib/constants";
import { cn, formatDims, formatINR, fmtLen, type DimUnit } from "@/lib/utils";

/** The minimum data needed to draw a sample-tag card (also used by the admin live preview). */
export type LotCardData = {
  lotNumber: string;
  title: string;
  slug: string;
  grade: string;
  gradeDetail?: string;
  condition: string;
  dimensions: { length: number; width: number; thickness?: number | null; unit: DimUnit };
  isRoll?: boolean;
  rollLength?: number | null;
  weightKg: number;
  unitType: string;
  sellByWeight: boolean;
  price: number;
  compareAtRetailPrice?: number | null;
  discountPct: number;
  images: { url: string; alt?: string }[];
  quantityAvailable: number;
  status: string;
  categoryId?: { name: string; slug: string } | null;
};

export function specLine(l: Pick<LotCardData, "dimensions" | "weightKg" | "grade" | "isRoll" | "rollLength" | "sellByWeight">) {
  const parts = [formatDims(l.dimensions)];
  if (l.isRoll && l.rollLength) parts.push(`ROLL ${fmtLen(l.rollLength)} M`);
  if (!l.sellByWeight && l.weightKg) parts.push(`${fmtLen(l.weightKg, 2)} KG`);
  parts.push(`GRADE ${l.grade}`);
  return parts.join(" · ");
}

/**
 * Archival sample tag: lot number top-left, grade stamp top-right, photo, mono spec block,
 * large mono price and an orange "% below retail" chip. Hover = offset "stamp".
 */
export function LotCard({ lot, priority, preview }: { lot: LotCardData; priority?: boolean; preview?: boolean }) {
  const tone = CATEGORY_TONE[lot.categoryId?.slug ?? ""] ?? "rule";
  const soldOut = lot.status === "sold-out" || lot.quantityAvailable <= 0;
  const cls = "group stamp-hover relative flex h-full flex-col border border-ink bg-paper focus-visible:outline-offset-4";
  const body = (
    <>
      {/* punched hole of a hanging tag */}
      <span className="absolute left-1/2 top-2 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-ink bg-paper" aria-hidden />
      <div className="flex items-start justify-between border-b border-ink px-3 py-2">
        <span className="spec text-[10px]">LOT #{lot.lotNumber}</span>
        <span className="spec border border-ink px-1 text-[10px]" title={lot.gradeDetail}>
          GR·{lot.grade}
        </span>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        {lot.images[0] ? (
          <SafeImage
            src={lot.images[0].url}
            alt={lot.images[0].alt || lot.title}
            fill
            priority={priority}
            sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
            className={cn("object-cover transition-transform duration-500 group-hover:scale-105", soldOut && "grayscale")}
          />
        ) : (
          <div className="grid h-full place-items-center font-mono text-xs text-graphite">NO PHOTO</div>
        )}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {lot.categoryId ? <Badge tone={tone}>{lot.categoryId.name}</Badge> : null}
          {soldOut ? <Badge tone="ink">Sold out</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-sans text-[15px] font-medium leading-snug">{lot.title}</h3>
        <p className="spec text-[10px] leading-relaxed text-graphite">{specLine(lot)}</p>
        <p className="spec text-[10px] text-graphite">
          {CONDITION_LABEL[lot.condition as keyof typeof CONDITION_LABEL] ?? lot.condition}
          {lot.gradeDetail ? ` · ${lot.gradeDetail}` : ""}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-dashed border-rule pt-2">
          <div>
            <p className="font-mono text-xl leading-none">
              {formatINR(lot.price)}
              <span className="text-[11px] text-graphite">/{lot.sellByWeight ? "kg" : lot.unitType}</span>
            </p>
            {lot.compareAtRetailPrice && lot.compareAtRetailPrice > lot.price ? (
              <p className="mt-1 font-mono text-[11px] text-graphite line-through">{formatINR(lot.compareAtRetailPrice)}</p>
            ) : null}
          </div>
          {lot.discountPct > 0 ? (
            <span className="spec border border-ink bg-signal px-1.5 py-1 text-[10px] font-bold text-signal-ink">
              −{lot.discountPct}% retail
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
  return preview ? (
    <div className={cls}>{body}</div>
  ) : (
    <Link href={`/lot/${lot.slug}`} className={cls}>
      {body}
    </Link>
  );
}

export function LotGrid({ lots, priorityCount = 0 }: { lots: LotCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {lots.map((l, i) => (
        <li key={l.slug}>
          <LotCard lot={l} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
