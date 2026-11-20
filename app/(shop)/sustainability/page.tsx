import type { Metadata } from "next";
import { ProsePage } from "@/components/layout/prose-page";
import { getImpactStats } from "@/lib/catalog";
import { CO2_FACTOR } from "@/models/Product";
import { formatNumber } from "@/lib/utils";
import { Table } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sustainability", description: "How OFFCUT measures kilograms diverted and CO₂e avoided." };

const SHOWN = ["leather", "textile", "aluminium", "steel", "copper", "wood", "marble", "acrylic", "carbon", "glass", "cork", "foam"];

export default async function SustainabilityPage() {
  const stats = await getImpactStats();
  const factors = Object.entries(CO2_FACTOR).filter(([k]) => SHOWN.includes(k));
  return (
    <ProsePage eyebrow="Impact" title={<>{formatNumber(stats.kgDiverted / 1000, 1)} tonnes <em>diverted.</em></>} intro="We count every kilogram — and we tell you exactly how we count it.">
      <div className="my-8 grid gap-px border border-ink bg-ink sm:grid-cols-3">
        <div className="bg-moss p-6 text-paper">
          <p className="spec text-[10px] text-paper/70">Kg diverted</p>
          <p className="mt-2 font-mono text-4xl">{formatNumber(stats.kgDiverted)}</p>
        </div>
        <div className="bg-paper p-6">
          <p className="spec text-[10px] text-graphite">Kg CO₂e avoided (est.)</p>
          <p className="mt-2 font-mono text-4xl text-moss">{formatNumber(stats.co2SavedKg)}</p>
        </div>
        <div className="bg-paper p-6">
          <p className="spec text-[10px] text-graphite">Partner factories</p>
          <p className="mt-2 font-mono text-4xl">{stats.partnerFactories}</p>
        </div>
      </div>
      <h2>Kilograms diverted</h2>
      <p>
        When a lot sells, its weight (unit weight × quantity) is added to the order&apos;s &ldquo;kg diverted&rdquo;. The site-wide counter
        is the total of all non-cancelled orders plus material diverted before the platform launched (an admin-set starting figure).
      </p>
      <h2>CO₂e avoided</h2>
      <p>
        Reusing an off-cut means one less kilogram of that material needs to be produced new. We multiply the weight by an approximate
        emission factor for virgin production. These are rounded literature values used for awareness — not certified carbon credits.
      </p>
      <div className="my-6">
        <Table>
          <thead>
            <tr>
              <th>Material keyword</th>
              <th className="text-right">kg CO₂e per kg (approx.)</th>
            </tr>
          </thead>
          <tbody>
            {factors.map(([k, v]) => (
              <tr key={k}>
                <td className="capitalize">{k}</td>
                <td className="text-right font-mono">{v}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <h2>For factories</h2>
      <p>Suppliers can download an ESG diversion certificate from their portal at any time, summarising kilograms diverted and estimated CO₂e avoided.</p>
    </ProsePage>
  );
}
