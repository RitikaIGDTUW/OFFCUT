import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { requireSupplierProfile } from "@/lib/supplier";
import { Product } from "@/models/Product";
import { Payout, SupplierSubmission } from "@/models/misc";
import { formatDate, formatINR, formatNumber, plain } from "@/lib/utils";
import { PageHeader, Stat, StatusBadge, Table } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Supplier dashboard" };

export default async function SupplierDashboard() {
  const { supplier } = await requireSupplierProfile();
  const sid = new Types.ObjectId(supplier._id);
  const [lotAgg, payouts, openSubs] = await Promise.all([
    Product.aggregate<{ listed: number; sold: number; views: number }>([
      { $match: { supplierId: sid } },
      { $group: { _id: null, listed: { $sum: 1 }, sold: { $sum: "$soldQty" }, views: { $sum: "$views" } } },
    ]),
    Payout.find({ supplierId: sid }).sort({ createdAt: -1 }).lean(),
    SupplierSubmission.countDocuments({ supplierId: sid, status: { $in: ["new", "reviewing", "offer-sent"] } }),
  ]);
  const lots = lotAgg[0] ?? { listed: 0, sold: 0, views: 0 };
  const earned = payouts.reduce((s, p) => s + p.amount, 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader eyebrow={supplier.industry} title={supplier.companyName}>
        <span className="flex items-center gap-2">
          Verification: <StatusBadge status={supplier.verificationStatus} />
          {supplier.verificationStatus === "rejected" && supplier.rejectionReason ? <span className="text-sm text-oxide">— {supplier.rejectionReason}</span> : null}
        </span>
      </PageHeader>

      {supplier.verificationStatus !== "verified" ? (
        <div className="mb-8 border border-signal p-4 text-sm">
          {supplier.verificationStatus === "pending"
            ? "Thanks for onboarding! An OFFCUT admin is verifying your GSTIN and documents. You can submit off-cuts once verified."
            : "Please update your details and documents — saving sends your profile back for review."}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Lots listed" value={lots.listed} />
        <Stat label="Units sold" value={formatNumber(lots.sold)} />
        <Stat label="Payouts earned" value={formatINR(earned)} sub={`${formatINR(paid)} paid out`} />
        <Stat label="Kg diverted" value={formatNumber(supplier.totalKgDiverted, 1)} tone="moss" />
        <Stat label="Open submissions" value={openSubs} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="signal">
          <Link href="/supplier/submit">Submit off-cuts</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/supplier/certificate" target="_blank" rel="noreferrer">
            Download ESG impact certificate (PDF)
          </a>
        </Button>
      </div>

      <h2 className="mb-4 mt-12 text-3xl">Payouts ledger</h2>
      {payouts.length ? (
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th className="text-right">Gross</th>
              <th className="text-right">Commission ({supplier.commissionRate}%)</th>
              <th className="text-right">Payout</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plain(payouts).map((p) => (
              <tr key={p._id}>
                <td className="text-xs">{formatDate(p.createdAt)}</td>
                <td className="font-mono text-xs">{p.orderNumber}</td>
                <td className="text-right font-mono">{formatINR(p.gross)}</td>
                <td className="text-right font-mono text-graphite">−{formatINR(p.commission)}</td>
                <td className="text-right font-mono">{formatINR(p.amount)}</td>
                <td>
                  <StatusBadge status={p.status} />
                  {p.reference ? <span className="ml-2 font-mono text-[10px] text-graphite">{p.reference}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-graphite">No payouts yet — they appear here when your lots sell.</p>
      )}
    </>
  );
}
