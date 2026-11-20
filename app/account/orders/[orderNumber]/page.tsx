import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatDateTime, formatINR, plain } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/constants";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { OrderRequestButtons } from "@/components/account/order-request";
import { RetryPayment } from "@/components/shop/retry-payment";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

const TIMELINE = ORDER_STATUS.filter((s) => !["cancelled", "returned"].includes(s));

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const s = await requirePageUser();
  await dbConnect();
  const doc = await Order.findOne({ orderNumber, userId: s.id }).lean();
  if (!doc) notFound();
  const o = plain(doc);
  const reached = TIMELINE.indexOf(o.orderStatus as (typeof TIMELINE)[number]);
  const a = o.shippingAddress;

  return (
    <>
      <PageHeader eyebrow={`Order · ${formatDateTime(o.createdAt)}`} title={<span className="font-mono text-4xl">{o.orderNumber}</span>}>
        <span className="flex gap-2">
          <StatusBadge status={o.orderStatus} />
          <StatusBadge status={o.paymentStatus} />
        </span>
      </PageHeader>

      {o.paymentMethod === "razorpay" && o.paymentStatus !== "paid" && o.orderStatus !== "cancelled" ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-signal p-4 text-sm">
          Payment is pending — your lots are held for 30 minutes from ordering.
          <RetryPayment orderNumber={o.orderNumber} />
        </div>
      ) : null}

      {/* Status timeline */}
      {o.orderStatus === "cancelled" || o.orderStatus === "returned" ? null : (
        <ol className="mb-10 grid grid-cols-5 border border-ink" aria-label="Order progress">
          {TIMELINE.map((st, i) => (
            <li key={st} className={cn("spec border-ink px-2 py-3 text-center text-[10px]", i > 0 && "border-l", i <= reached ? "bg-ink text-paper" : "text-graphite")} aria-current={i === reached ? "step" : undefined}>
              {st}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <ul className="divide-y divide-rule border-y border-ink">
            {o.items.map((i) => (
              <li key={i.lotNumber} className="flex gap-4 py-4">
                <span className="relative h-16 w-16 shrink-0 border border-ink">{i.image ? <SafeImage src={i.image} alt="" fill sizes="64px" className="object-cover" /> : null}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="spec block text-[10px] text-graphite">LOT #{i.lotNumber}</span>
                  <Link href={`/lot/${i.slug}`} className="font-medium hover:underline">
                    {i.title}
                  </Link>
                  <span className="spec block text-[10px] text-graphite">{i.specs}</span>
                </span>
                <span className="text-right font-mono text-sm">
                  {i.qty} × {formatINR(i.price)}
                  <br />
                  {formatINR(i.qty * i.price)}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-3xl">History</h2>
          <ol className="mt-4 border-l border-ink">
            {o.statusHistory
              .slice()
              .reverse()
              .map((h, idx) => (
                <li key={idx} className="relative pb-4 pl-5">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 bg-signal" aria-hidden />
                  <p className="spec text-[11px]">{h.status}</p>
                  {h.note ? <p className="text-sm text-graphite">{h.note}</p> : null}
                  <p className="font-mono text-[10px] text-graphite">{formatDateTime(h.at)}</p>
                </li>
              ))}
          </ol>
        </div>

        <aside className="space-y-4">
          <div className="border border-ink p-4 text-sm">
            <p className="spec mb-2 text-[10px] text-graphite">Ship to</p>
            {a.fullName}
            <br />
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}
            <br />
            {a.city}, {a.state} {a.pincode}
            <br />
            {a.phone}
          </div>
          {o.trackingNumber ? (
            <div className="border border-ink p-4 text-sm">
              <p className="spec mb-2 text-[10px] text-graphite">Tracking</p>
              {o.courier} · <span className="font-mono">{o.trackingNumber}</span>
            </div>
          ) : null}
          <dl className="border border-ink p-4 text-sm [&>div]:flex [&>div]:justify-between [&>div]:py-1">
            <div>
              <dt>Subtotal</dt>
              <dd className="font-mono">{formatINR(o.subtotal)}</dd>
            </div>
            {o.discount ? (
              <div className="text-moss">
                <dt>Discount {o.couponCode}</dt>
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
            <div className="mt-2 border-t border-ink pt-2 text-base">
              <dt className="spec">Total</dt>
              <dd className="font-mono">{formatINR(o.total)}</dd>
            </div>
          </dl>
          <a href={`/api/orders/${o.orderNumber}/invoice`} target="_blank" rel="noreferrer" className="spec block border border-ink px-4 py-3 text-center text-xs hover:bg-ink hover:text-paper">
            Download invoice (PDF)
          </a>
          <OrderRequestButtons
            orderNumber={o.orderNumber}
            canCancel={["placed", "confirmed"].includes(o.orderStatus) && !o.cancelRequest?.reason}
            canReturn={o.orderStatus === "delivered" && !o.returnRequest?.reason}
            pendingNote={o.cancelRequest?.reason && !o.cancelRequest.resolved ? "Cancellation requested — we'll confirm shortly." : o.returnRequest?.reason && !o.returnRequest.resolved ? "Return requested — we'll arrange pickup." : undefined}
          />
        </aside>
      </div>
    </>
  );
}
