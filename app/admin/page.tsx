import Link from "next/link";
import { dashboardStats } from "@/lib/admin-stats";
import { formatDateTime, formatINR, formatNumber, plain } from "@/lib/utils";
import { PageHeader, Stat, StatusBadge, Table } from "@/components/ui/primitives";
import { HBarChart, RevenueChart } from "@/components/admin/charts";

export const metadata = { title: "Dashboard" };

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border border-ink bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="spec text-[11px]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AdminDashboard() {
  const s = await dashboardStats();
  const recent = plain(s.recent);
  return (
    <>
      <PageHeader eyebrow="Admin" title={<>Floor <em>report</em></>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue today" value={formatINR(s.kpi.today)} />
        <Stat label="Revenue 7 days" value={formatINR(s.kpi.week)} />
        <Stat label="Revenue 30 days" value={formatINR(s.kpi.month)} sub={`${s.kpi.orders30} orders · AOV ${formatINR(s.kpi.aov)}`} />
        <Stat label="New users (30d)" value={s.kpi.newUsers} />
        <Stat label="Kg diverted (all time)" value={formatNumber(s.kpi.kgDiverted, 1)} tone="moss" />
        <Stat label="Low-stock lots" value={s.kpi.lowStockCount} tone={s.kpi.lowStockCount ? "signal" : undefined} />
        <Stat label="Orders (30d)" value={s.kpi.orders30} />
        <Stat label="Pending submissions" value={s.pendingSubs.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="Revenue · last 30 days">
            <RevenueChart data={s.series} />
          </Panel>
        </div>
        <Panel title="Orders by status">
          <HBarChart data={s.byStatus} label="Number of orders in each status" />
        </Panel>
        <Panel title="Top categories by revenue">
          {s.topCats.length ? <HBarChart data={s.topCats} money label="Revenue by category" /> : <p className="text-sm text-graphite">No sales yet.</p>}
        </Panel>
        <Panel title="Low stock" action={<Link href="/admin/inventory" className="spec text-[10px] underline">Inventory →</Link>}>
          <ul className="divide-y divide-rule text-sm">
            {s.lowStock.length === 0 ? <li className="py-2 text-graphite">All good.</li> : null}
            {plain(s.lowStock).map((p) => (
              <li key={p._id} className="flex justify-between gap-2 py-2">
                <Link href={`/admin/products/${p._id}`} className="truncate hover:underline">
                  <span className="font-mono text-xs">#{p.lotNumber}</span> {p.title}
                </Link>
                <span className="font-mono text-signal">{p.quantityAvailable}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Pending supplier submissions" action={<Link href="/admin/submissions" className="spec text-[10px] underline">Kanban →</Link>}>
          <ul className="divide-y divide-rule text-sm">
            {s.pendingSubs.length === 0 ? <li className="py-2 text-graphite">Inbox zero.</li> : null}
            {plain(s.pendingSubs).map((sub) => (
              <li key={sub._id} className="py-2">
                <p className="font-medium">{sub.material}</p>
                <p className="text-xs text-graphite">
                  {(sub.supplierId as unknown as { companyName?: string })?.companyName} · {sub.approxQuantity}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Recent orders" action={<Link href="/admin/orders" className="spec text-[10px] underline">All orders →</Link>}>
          <Table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o._id}>
                  <td>
                    <Link href={`/admin/orders/${o._id}`} className="font-mono text-xs underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="text-xs">{o.email}</td>
                  <td className="text-xs">{formatDateTime(o.createdAt)}</td>
                  <td>
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td>
                    <StatusBadge status={o.orderStatus} />
                  </td>
                  <td className="text-right font-mono">{formatINR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
