import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { features } from "@/lib/env";
import { formatDateTime, formatINR, plain } from "@/lib/utils";
import { Badge, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { OrderAdminControls } from "@/components/admin/order-controls";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await dbConnect();
  const doc = await Order.findById(id).lean();
  if (!doc) notFound();
  const o = plain(doc);
  const customer = await User.findById(doc.userId).select("name email phone").lean();
  const a = o.shippingAddress;
  return (
    <>
      <PageHeader eyebrow={formatDateTime(o.createdAt)} title={<span className="font-mono text-4xl">{o.orderNumber}</span>}>
        <span className="flex flex-wrap gap-2">
          <StatusBadge status={o.orderStatus} />
          <StatusBadge status={o.paymentStatus} />
          <Badge>{o.paymentMethod}</Badge>
          <Badge>{o.shippingMethod}</Badge>
        </span>
      </PageHeader>

      {o.cancelRequest?.reason && !o.cancelRequest.resolved ? (
        <p className="mb-4 border border-signal p-3 text-sm">Customer requested cancellation: “{o.cancelRequest.reason}” — set status to <b>cancelled</b> to approve (stock is restored automatically).</p>
      ) : null}
      {o.returnRequest?.reason && !o.returnRequest.resolved ? (
        <p className="mb-4 border border-signal p-3 text-sm">Customer requested a return: “{o.returnRequest.reason}” — set status to <b>returned</b> and refund when it arrives.</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="border border-ink">
            <h2 className="spec border-b border-ink bg-paper-2 px-4 py-2 text-[11px]">Items</h2>
            <ul className="divide-y divide-rule">
              {o.items.map((i) => (
                <li key={i.lotNumber} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <span>
                    <Link href={`/admin/products/${i.productId}`} className="font-mono text-xs underline">
                      #{i.lotNumber}
                    </Link>{" "}
                    {i.title}
                    <span className="block font-mono text-[10px] text-graphite">{i.specs}</span>
                  </span>
                  <span className="whitespace-nowrap font-mono">
                    {i.qty} × {formatINR(i.price)} = {formatINR(i.qty * i.price)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="border-t border-ink px-4 py-3 text-sm [&>div]:flex [&>div]:justify-between [&>div]:py-0.5">
              <div>
                <dt>Subtotal</dt>
                <dd className="font-mono">{formatINR(o.subtotal)}</dd>
              </div>
              {o.discount ? (
                <div>
                  <dt>Discount ({o.couponCode})</dt>
                  <dd className="font-mono">−{formatINR(o.discount)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Shipping</dt>
                <dd className="font-mono">{formatINR(o.shipping)}</dd>
              </div>
              <div>
                <dt>GST {o.taxRate}%</dt>
                <dd className="font-mono">{formatINR(o.tax)}</dd>
              </div>
              <div className="font-semibold">
                <dt>Total</dt>
                <dd className="font-mono">{formatINR(o.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-ink p-4">
            <h2 className="spec mb-3 text-[11px]">Status history</h2>
            <ol className="space-y-2 text-sm">
              {o.statusHistory
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i} className="grid grid-cols-[150px_1fr] gap-3">
                    <span className="font-mono text-[11px] text-graphite">{formatDateTime(h.at)}</span>
                    <span>
                      <b className="spec text-[11px]">{h.status}</b> {h.note ? `— ${h.note}` : ""} <span className="text-xs text-graphite">{h.by}</span>
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="border border-ink p-4 text-sm">
            <p className="spec mb-2 text-[10px] text-graphite">Customer</p>
            <p className="font-medium">{customer?.name}</p>
            <p>{customer?.email}</p>
            <p className="mt-3 spec text-[10px] text-graphite">Ship to</p>
            <p>
              {a.fullName} · {a.phone}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
            </p>
          </div>
          <div className="border border-ink p-4 text-sm">
            <p className="spec mb-2 text-[10px] text-graphite">Payment</p>
            <p>
              {o.paymentMethod === "cod" ? "Cash on delivery" : "Razorpay"} · <StatusBadge status={o.paymentStatus} />
            </p>
            {o.razorpayOrderId ? <p className="mt-1 break-all font-mono text-[11px]">Order: {o.razorpayOrderId}</p> : null}
            {o.razorpayPaymentId ? <p className="break-all font-mono text-[11px]">Payment: {o.razorpayPaymentId}</p> : null}
            {o.razorpayRefundId ? <p className="break-all font-mono text-[11px]">Refund: {o.razorpayRefundId}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={`/api/orders/${o.orderNumber}/invoice`} target="_blank" rel="noreferrer" className="spec border border-ink px-3 py-2 text-center text-[11px] hover:bg-ink hover:text-paper">
              Invoice PDF
            </a>
            <a href={`/api/orders/${o.orderNumber}/invoice?type=slip`} target="_blank" rel="noreferrer" className="spec border border-ink px-3 py-2 text-center text-[11px] hover:bg-ink hover:text-paper">
              Packing slip
            </a>
          </div>
          <OrderAdminControls
            id={o._id}
            status={o.orderStatus}
            courier={o.courier ?? ""}
            tracking={o.trackingNumber ?? ""}
            canRefund={o.paymentStatus === "paid" && (o.paymentMethod === "cod" || features.razorpay)}
          />
        </aside>
      </div>
    </>
  );
}
