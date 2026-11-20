import { dbConnect } from "@/lib/db";
import { Coupon } from "@/models/misc";
import { Order } from "@/models/Order";
import { formatDate, formatINR, plain } from "@/lib/utils";
import { Badge, PageHeader, Table } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CouponForm, DeleteCouponButton } from "@/components/admin/widgets";

export const metadata = { title: "Coupons" };

const d = (v?: string | null) => (v ? v.slice(0, 10) : "");

export default async function CouponsAdminPage() {
  await dbConnect();
  const [coupons, usage] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).lean(),
    Order.aggregate<{ _id: string; orders: number; discount: number; revenue: number }>([
      { $match: { couponCode: { $ne: null }, orderStatus: { $nin: ["cancelled", "returned"] } } },
      { $group: { _id: "$couponCode", orders: { $sum: 1 }, discount: { $sum: "$discount" }, revenue: { $sum: "$total" } } },
    ]),
  ]);
  const byCode = new Map(usage.map((u) => [u._id, u]));
  return (
    <>
      <PageHeader eyebrow="Marketing" title={<>Coupons</>}>
        <CouponForm trigger={<Button variant="signal">+ New coupon</Button>} />
      </PageHeader>
      <Table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Min order</th>
            <th>Used</th>
            <th>Orders · discount given · revenue</th>
            <th>Valid</th>
            <th>State</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {plain(coupons).map((c) => {
            const u = byCode.get(c.code);
            return (
              <tr key={c._id}>
                <td className="font-mono font-bold">{c.code}</td>
                <td className="font-mono">{c.type === "percent" ? `${c.value}%` : formatINR(c.value)}</td>
                <td className="font-mono">{formatINR(c.minOrder)}</td>
                <td className="font-mono">
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="font-mono text-xs">{u ? `${u.orders} · ${formatINR(u.discount)} · ${formatINR(u.revenue)}` : "—"}</td>
                <td className="text-xs">
                  {c.startsAt ? formatDate(c.startsAt) : "now"} → {c.expiresAt ? formatDate(c.expiresAt) : "∞"}
                </td>
                <td>{c.isActive ? <Badge tone="moss">Active</Badge> : <Badge>Off</Badge>}</td>
                <td className="flex gap-1">
                  <CouponForm
                    id={c._id}
                    initial={{ code: c.code, description: c.description ?? "", type: c.type, value: c.value, minOrder: c.minOrder, maxUses: c.maxUses ?? 0, perUserLimit: c.perUserLimit, startsAt: d(c.startsAt), expiresAt: d(c.expiresAt), isActive: c.isActive }}
                    trigger={<Button size="sm" variant="outline">Edit</Button>}
                  />
                  <DeleteCouponButton id={c._id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
