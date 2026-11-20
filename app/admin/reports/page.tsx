import type { PipelineStage } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatINR, formatNumber, sp } from "@/lib/utils";
import { PageHeader, Stat, Table } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { HBarChart } from "@/components/admin/charts";

export const metadata = { title: "Reports" };

type Row = { _id: string; revenue: number; qty: number; orders: number };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const from = sp(params.from) || monthAgo;
  const to = sp(params.to) || today;
  await dbConnect();

  const match: PipelineStage.Match = {
    $match: { orderStatus: { $nin: ["cancelled", "returned"] }, paymentStatus: { $ne: "refunded" }, createdAt: { $gte: new Date(from), $lte: new Date(`${to}T23:59:59`) } },
  };
  const lineRevenue = { $multiply: ["$items.price", "$items.qty"] };
  const [totals, byCategory, bySupplier, byDay] = await Promise.all([
    Order.aggregate<{ revenue: number; orders: number; kg: number; tax: number; discount: number }>([
      match,
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, kg: { $sum: "$kgDiverted" }, tax: { $sum: "$tax" }, discount: { $sum: "$discount" } } },
    ]),
    Order.aggregate<Row>([
      match,
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      { $lookup: { from: "categories", localField: "p.categoryId", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $group: { _id: "$c.name", revenue: { $sum: lineRevenue }, qty: { $sum: "$items.qty" }, orders: { $addToSet: "$_id" } } },
      { $project: { revenue: 1, qty: 1, orders: { $size: "$orders" } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate<Row>([
      match,
      { $unwind: "$items" },
      { $lookup: { from: "suppliers", localField: "items.supplierId", foreignField: "_id", as: "s" } },
      { $group: { _id: { $ifNull: [{ $arrayElemAt: ["$s.companyName", 0] }, "OFFCUT stock"] }, revenue: { $sum: lineRevenue }, qty: { $sum: "$items.qty" }, orders: { $addToSet: "$_id" } } },
      { $project: { revenue: 1, qty: 1, orders: { $size: "$orders" } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate<Row>([
      match,
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" }, qty: { $sum: 1 }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const t = totals[0] ?? { revenue: 0, orders: 0, kg: 0, tax: 0, discount: 0 };

  const table = (title: string, rows: Row[], label: string) => (
    <section>
      <h2 className="mb-3 text-3xl">{title}</h2>
      {rows.length ? (
        <>
          <div className="mb-4 border border-ink p-4">
            <HBarChart data={rows.slice(0, 8).map((r) => ({ name: r._id, value: Math.round(r.revenue) }))} money label={`Revenue by ${label}`} />
          </div>
          <Table>
            <thead>
              <tr>
                <th>{label}</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Units</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r._id}</td>
                  <td className="text-right font-mono">{r.orders}</td>
                  <td className="text-right font-mono">{formatNumber(r.qty, 1)}</td>
                  <td className="text-right font-mono">{formatINR(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <p className="text-graphite">No sales in this range.</p>
      )}
    </section>
  );

  return (
    <>
      <PageHeader eyebrow="Analytics" title={<>Sales <em>reports</em></>} />
      <form className="mb-8 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="spec mb-1 block text-[10px] text-graphite">From</span>
          <Input type="date" name="from" defaultValue={from} />
        </label>
        <label className="text-xs">
          <span className="spec mb-1 block text-[10px] text-graphite">To</span>
          <Input type="date" name="to" defaultValue={to} />
        </label>
        <Button type="submit">Apply</Button>
        <Button asChild variant="outline">
          <a href={`/api/admin/export?type=sales&from=${from}&to=${to}`}>Export CSV</a>
        </Button>
      </form>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Revenue (incl. GST)" value={formatINR(t.revenue)} />
        <Stat label="Orders" value={t.orders} />
        <Stat label="GST collected" value={formatINR(t.tax)} />
        <Stat label="Discounts given" value={formatINR(t.discount)} />
        <Stat label="Kg diverted" value={formatNumber(t.kg, 1)} tone="moss" />
      </div>
      <div className="space-y-12">
        {table("By category", byCategory, "Category")}
        {table("By supplier", bySupplier, "Supplier")}
        <section>
          <h2 className="mb-3 text-3xl">By day</h2>
          <Table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((r) => (
                <tr key={r._id}>
                  <td className="font-mono text-xs">{r._id}</td>
                  <td className="text-right font-mono">{r.orders}</td>
                  <td className="text-right font-mono">{formatINR(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      </div>
    </>
  );
}
