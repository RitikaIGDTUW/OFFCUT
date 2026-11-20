import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatDate, formatINR, plain } from "@/lib/utils";
import { EmptyState, PageHeader, StatusBadge, Table } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const s = await requirePageUser();
  await dbConnect();
  const orders = plain(await Order.find({ userId: s.id }).sort({ createdAt: -1 }).lean());
  return (
    <>
      <PageHeader eyebrow="Account" title={<>Your <em>orders</em></>} />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet." action={<Button asChild variant="signal"><Link href="/shop">Shop lots</Link></Button>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Lots</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td>
                  <Link href={`/account/orders/${o.orderNumber}`} className="font-mono text-xs underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="text-xs">{formatDate(o.createdAt)}</td>
                <td className="text-xs">{o.items.length}</td>
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
      )}
    </>
  );
}
