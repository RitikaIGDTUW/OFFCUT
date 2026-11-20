import type { Metadata } from "next";
import Link from "next/link";
import { requireSupplierProfile } from "@/lib/supplier";
import { SupplierSubmission } from "@/models/misc";
import { formatDate, formatDateTime, formatINR, plain } from "@/lib/utils";
import { SUBMISSION_STATUS } from "@/lib/constants";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { OfferResponse } from "@/components/supplier/supplier-forms";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Submissions" };

const FLOW = SUBMISSION_STATUS.filter((s) => s !== "rejected");

export default async function SubmissionsPage() {
  const { supplier } = await requireSupplierProfile();
  const subs = plain(await SupplierSubmission.find({ supplierId: supplier._id }).sort({ createdAt: -1 }).lean());
  return (
    <>
      <PageHeader eyebrow="Supplier portal" title={<>Your <em>submissions</em></>} />
      {subs.length === 0 ? (
        <EmptyState title="Nothing submitted." action={<Button asChild variant="signal"><Link href="/supplier/submit">Submit off-cuts</Link></Button>} />
      ) : (
        <ul className="space-y-6">
          {subs.map((s) => {
            const idx = FLOW.indexOf(s.status as (typeof FLOW)[number]);
            return (
              <li key={s._id} className="border border-ink">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink p-4">
                  <div>
                    <p className="spec text-[10px] text-graphite">Submitted {formatDate(s.createdAt)}</p>
                    <p className="text-xl font-medium">{s.material}</p>
                    <p className="text-sm text-graphite">
                      {s.approxQuantity} · {s.approxDimensions}
                      {s.askingPrice ? ` · asking ${formatINR(s.askingPrice)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                {s.status !== "rejected" ? (
                  <ol className="grid grid-cols-3 border-b border-ink sm:grid-cols-6" aria-label="Submission progress">
                    {FLOW.map((st, i) => (
                      <li key={st} className={cn("spec px-2 py-2 text-center text-[9px]", i > 0 && "border-l border-rule", i <= idx ? "bg-ink text-paper" : "text-graphite")}>
                        {st}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex gap-2 overflow-x-auto">
                      {s.photos.map((p) => (
                        <span key={p.url} className="relative h-20 w-20 shrink-0 border border-ink">
                          <SafeImage src={p.url} alt={s.material} fill sizes="80px" className="object-cover" />
                        </span>
                      ))}
                    </div>
                    <ol className="mt-4 space-y-1 text-xs text-graphite">
                      {s.statusHistory.map((h, i) => (
                        <li key={i}>
                          <span className="font-mono">{formatDateTime(h.at)}</span> — {h.status}
                          {h.note ? `: ${h.note}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {s.adminOffer ? (
                    <div className="h-fit border border-signal p-4">
                      <p className="spec text-[10px] text-graphite">OFFCUT offer</p>
                      <p className="mt-1 font-mono text-3xl">{formatINR(s.adminOffer.amount)}</p>
                      {s.adminOffer.message ? <p className="mt-2 text-sm">{s.adminOffer.message}</p> : null}
                      <div className="mt-3">
                        {s.status === "offer-sent" ? <OfferResponse id={s._id} /> : <p className="text-xs text-graphite">You {s.supplierResponse ?? "responded"} this offer.</p>}
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
