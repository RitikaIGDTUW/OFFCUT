import type { Metadata } from "next";
import Link from "next/link";
import { requireSupplierProfile } from "@/lib/supplier";
import { Product } from "@/models/Product";
import { formatDims, formatINR, plain } from "@/lib/utils";
import { PageHeader, StatusBadge, Table } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Listed lots" };

/** Read-only performance view of the supplier's listed lots. */
export default async function SupplierLotsPage() {
  const { supplier } = await requireSupplierProfile();
  const lots = plain(
    await Product.find({ supplierId: supplier._id }).select("lotNumber title slug dimensions price quantityAvailable soldQty views status sustainability").sort({ createdAt: -1 }).lean(),
  );
  return (
    <>
      <PageHeader eyebrow="Supplier portal" title={<>Listed <em>lots</em></>}>
        Lots created from your submissions. Prices are set by OFFCUT after grading.
      </PageHeader>
      {lots.length ? (
        <Table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Title</th>
              <th>Dimensions</th>
              <th className="text-right">Price</th>
              <th className="text-right">Views</th>
              <th className="text-right">Sold</th>
              <th className="text-right">Left</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l._id}>
                <td className="font-mono text-xs">#{l.lotNumber}</td>
                <td>
                  {l.status === "active" || l.status === "sold-out" ? (
                    <Link href={`/lot/${l.slug}`} className="hover:underline">
                      {l.title}
                    </Link>
                  ) : (
                    l.title
                  )}
                </td>
                <td className="whitespace-nowrap font-mono text-xs">{formatDims(l.dimensions)}</td>
                <td className="text-right font-mono">{formatINR(l.price)}</td>
                <td className="text-right font-mono">{l.views}</td>
                <td className="text-right font-mono">{l.soldQty}</td>
                <td className="text-right font-mono">{l.quantityAvailable}</td>
                <td>
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-graphite">No lots listed yet.</p>
      )}
    </>
  );
}
