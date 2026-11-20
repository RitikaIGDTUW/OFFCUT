import { ImageResponse } from "next/og";
import { OG_SIZE, SampleTagOG } from "@/lib/og";

export const alt = "OFFCUT — Industrial-grade leftovers. Maker-grade prices.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    <SampleTagOG lot="LOT #A-0000" title="Industrial-grade leftovers. Maker-grade prices." specs="LEATHER · TEXTILES · METALS · WOOD · STONE · COMPOSITES" badge="DEAD-STOCK EXCHANGE" />,
    size,
  );
}
