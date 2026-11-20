import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Product } from "@/models/Product";
import { StockAdjustment } from "@/models/misc";
import { formatDateTime, plain } from "@/lib/utils";
import { PageHeader, StatusBadge, Table } from "@/components/ui/primitives";
import { StockAdjuster } from "@/components/admin/widgets";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  await dbConnect();
  const settings = await getSettings();
  const [lots, log] = await Promise.all([
    Product.find({ status: { $in: ["active", "sold-out", "draft"] } }).select("lotNumber title quantityAvailable soldQty status").sort({ quantityAvailable: 1 }).limit(300).lean(),
    StockAdjustment.find().sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Stock" title={<>Inventory</>}>
        Low-stock threshold: <b className="font-mono">{settings.lowStockThreshold}</b> (change it in Content &amp; settings). Lots at or below it are highlighted.
      </PageHeader>
      <Table>
        <thead>
          <tr>
            <th>Lot</th>
            <th>Title</th>
            <th>Status</th>
            <th>Sold</th>
            <th>Stock · adjust (+/−) with reason</th>
          </tr>
        </thead>
        <tbody>
          {plain(lots).map((l) => (
            <tr key={l._id} className={l.quantityAvailable <= settings.lowStockThreshold ? "bg-signal/10" : undefined}>
              <td className="font-mono text-xs">#{l.lotNumber}</td>
              <td>
                <Link href={`/admin/products/${l._id}`} className="hover:underline">
                  {l.title}
                </Link>
              </td>
              <td>
                <StatusBadge status={l.status} />
              </td>
              <td className="font-mono">{l.soldQty}</td>
              <td>
                <StockAdjuster id={l._id} qty={l.quantityAvailable} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h2 className="mb-4 mt-12 text-3xl">Stock adjustment log</h2>
      <Table>
        <thead>
          <tr>
            <th>When</th>
            <th>Lot</th>
            <th>Change</th>
            <th>New qty</th>
            <th>Reason</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {plain(log).map((a) => (
            <tr key={a._id}>
              <td className="text-xs">{formatDateTime(a.createdAt)}</td>
              <td className="font-mono text-xs">#{a.lotNumber}</td>
              <td className={`font-mono ${a.delta > 0 ? "text-moss" : "text-oxide"}`}>{a.delta > 0 ? `+${a.delta}` : a.delta}</td>
              <td className="font-mono">{a.resultingQty}</td>
              <td className="text-sm">{a.reason}</td>
              <td className="text-xs">{a.by}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
