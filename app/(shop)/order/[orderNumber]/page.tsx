import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatINR, plain } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/primitives";
import { RetryPayment } from "@/components/shop/retry-payment";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requirePageUser(undefined, `/order/${orderNumber}`);
  await dbConnect();
  const doc = await Order.findOne({ orderNumber, ...(user.role === "admin" ? {} : { userId: user.id }) }).lean();
  if (!doc) notFound();
  const order = plain(doc);
  const awaitingPayment = order.paymentMethod === "razorpay" && order.paymentStatus !== "paid" && order.orderStatus !== "cancelled";

  return (
    <div className="container-x max-w-4xl py-14">
      <p className="spec text-[11px] text-graphite">Order {order.orderNumber}</p>
      <h1 className="mt-3 text-6xl leading-none md:text-7xl">
        {awaitingPayment ? (
          <>
            Payment <em className="text-signal">pending.</em>
          </>
        ) : order.orderStatus === "cancelled" ? (
          <>Order cancelled.</>
        ) : (
          <>
            Thank you — <em>it&apos;s yours.</em>
          </>
        )}
      </h1>
      <div className="mt-4 flex gap-2">
        <StatusBadge status={order.orderStatus} />
        <StatusBadge status={order.paymentStatus} />
      </div>

      {awaitingPayment ? (
        <div className="mt-8 border border-signal p-5">
          <p className="text-sm">Your lots are reserved for 30 minutes while you complete payment. Nothing has been charged yet.</p>
          <div className="mt-4">
            <RetryPayment orderNumber={order.orderNumber} />
          </div>
        </div>
      ) : null}

      {/* Impact summary */}
      <div className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-3">
        <div className="bg-moss p-6 text-paper">
          <p className="spec text-[10px] text-paper/70">Diverted from landfill</p>
          <p className="mt-2 font-mono text-4xl">{order.kgDiverted.toFixed(1)} kg</p>
        </div>
        <div className="bg-paper p-6">
          <p className="spec text-[10px] text-graphite">CO₂e avoided (est.)</p>
          <p className="mt-2 font-mono text-4xl text-moss">{order.co2SavedKg.toFixed(1)} kg</p>
        </div>
        <div className="bg-paper p-6">
          <p className="spec text-[10px] text-graphite">Total</p>
          <p className="mt-2 font-mono text-4xl">{formatINR(order.total)}</p>
          <p className="text-xs text-graphite">{order.paymentMethod === "cod" ? "Cash on delivery" : "Razorpay"}</p>
        </div>
      </div>

      <ul className="mt-10 divide-y divide-rule border-y border-ink">
        {order.items.map((i) => (
          <li key={i.lotNumber} className="flex justify-between gap-4 py-3 text-sm">
            <span>
              <span className="spec mr-2 text-[10px] text-graphite">#{i.lotNumber}</span>
              {i.title} × {i.qty}
            </span>
            <span className="font-mono">{formatINR(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/account/orders/${order.orderNumber}`}>Track order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">Keep browsing</Link>
        </Button>
      </div>
    </div>
  );
}
