import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { impactLevel, userImpact, IMPACT_LEVELS } from "@/lib/account";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { formatDate, formatINR, formatNumber, plain } from "@/lib/utils";
import { PageHeader, Stat, StatusBadge, Table } from "@/components/ui/primitives";
import { ResendVerification } from "@/components/account/resend-verification";

export const metadata: Metadata = { title: "My account" };

export default async function AccountDashboard() {
  const s = await requirePageUser();
  await dbConnect();
  const [impact, orders, user] = await Promise.all([
    userImpact(s.id),
    Order.find({ userId: s.id }).sort({ createdAt: -1 }).limit(5).lean(),
    User.findById(s.id).select("emailVerified buyerType").lean(),
  ]);
  const level = impactLevel(impact.kg);

  return (
    <>
      <PageHeader eyebrow="Account" title={<>Hello, <em>{s.name.split(" ")[0]}</em></>} />
      {!user?.emailVerified ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-signal p-4 text-sm">
          <span>Please verify your email address — check your inbox (or the server console in local mode).</span>
          <ResendVerification />
        </div>
      ) : null}

      <div className="grid gap-px border border-ink bg-ink md:grid-cols-4">
        <div className="bg-moss p-5 text-paper md:col-span-2">
          <p className="spec text-[10px] text-paper/70">Your impact level</p>
          <p className="mt-2 font-display text-4xl">{level.name}</p>
          <div className="mt-4 h-2 border border-paper/60">
            <div className="h-full bg-signal" style={{ width: `${level.progress}%` }} />
          </div>
          <p className="spec mt-2 text-[10px] text-paper/70">
            {level.next === Infinity ? "Top level reached" : `${formatNumber(level.next - impact.kg, 1)} kg to next level`}
          </p>
        </div>
        <div className="bg-paper">
          <Stat label="Kg diverted by you" value={formatNumber(impact.kg, 1)} tone="moss" />
        </div>
        <div className="bg-paper">
          <Stat label="CO₂e avoided (est.)" value={`${formatNumber(impact.co2, 0)} kg`} />
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Badge levels">
        {IMPACT_LEVELS.map((l) => (
          <li key={l.name} className={`spec border px-2 py-1 text-[10px] ${impact.kg >= l.min ? "border-moss bg-moss text-paper" : "border-rule text-graphite"}`}>
            {l.name} · {l.min}+ kg
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-3xl">Recent orders</h2>
        <Link href="/account/orders" className="spec text-[11px] underline">
          All orders →
        </Link>
      </div>
      <div className="mt-4">
        {orders.length ? (
          <Table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {plain(orders).map((o) => (
                <tr key={o._id}>
                  <td>
                    <Link href={`/account/orders/${o.orderNumber}`} className="font-mono text-xs underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="text-xs">{formatDate(o.createdAt)}</td>
                  <td>
                    <StatusBadge status={o.orderStatus} />
                  </td>
                  <td className="text-right font-mono">{formatINR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-graphite">
            No orders yet.{" "}
            <Link href="/shop" className="underline">
              Find your first lot →
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
