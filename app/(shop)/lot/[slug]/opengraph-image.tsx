import { ImageResponse } from "next/og";
import { OG_SIZE, SampleTagOG } from "@/lib/og";
import { getLotBySlug } from "@/lib/lot";
import { formatDims } from "@/lib/utils";

export const alt = "OFFCUT lot";
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

/** Dynamic OG image per lot, styled as an archival sample tag. */
export default async function LotOG({ params }: { params: Promise<{ slug: string }> }) {
  const lot = await getLotBySlug((await params).slug).catch(() => null);
  if (!lot) return new ImageResponse(<SampleTagOG lot="LOT #—" title="Lot not found" specs="" />, size);
  const img = lot.images[0]?.url;
  // Satori can't decode WebP/AVIF, so ask Unsplash for a JPEG explicitly.
  const jpg = img?.includes("images.unsplash.com") ? img.replace("auto=format", "fm=jpg").replace("w=1600", "w=600") : img;
  return new ImageResponse(
    <SampleTagOG
      lot={`LOT #${lot.lotNumber}`}
      title={lot.title}
      specs={`${formatDims(lot.dimensions)} · GRADE ${lot.grade}`}
      price={`Rs.${Math.round(lot.price).toLocaleString("en-IN")}`}
      badge={lot.discountPct ? `-${lot.discountPct}% RETAIL` : undefined}
      image={jpg}
    />,
    size,
  );
}
