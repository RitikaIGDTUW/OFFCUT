import { dbConnect } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import { Payout } from "@/models/misc";
import "@/models/User";
import { formatDate, formatINR, plain } from "@/lib/utils";
import { PageHeader, StatusBadge, Table } from "@/components/ui/primitives";
import { MarkPaidButton, SupplierControls } from "@/components/admin/widgets";

export const metadata = { title: "Suppliers" };

export default async function SuppliersAdminPage() {
  await dbConnect();
  const [sups, payouts] = await Promise.all([
    Supplier.find().select("+payoutDetails").populate("userId", "email name").sort({ verificationStatus: 1, createdAt: -1 }).lean(),
    Payout.find().sort({ status: 1, createdAt: -1 }).limit(200).populate("supplierId", "companyName").lean(),
  ]);
  const list = plain(sups);
  return (
    <>
      <PageHeader eyebrow="Sourcing" title={<>Suppliers</>} />
      <ul className="space-y-4">
        {list.map((s) => {
          const u = s.userId as unknown as { email?: string; name?: string };
          const p = s.payoutDetails;
          return (
            <li key={s._id} className="border border-ink">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink p-4">
                <div>
                  <p className="text-xl font-medium">{s.companyName}</p>
                  <p className="text-sm text-graphite">
                    {s.industry} · {u?.email} · joined {formatDate(s.createdAt)}
                  </p>
                </div>
                <StatusBadge status={s.verificationStatus} />
              </div>
              <div className="grid gap-4 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="spec text-[10px] text-graphite">Company</p>
                  <p className="font-mono text-xs">GSTIN {s.gstin ?? "—"}</p>
                  <p>{s.contactPerson} · {s.phone}</p>
                  <p className="text-graphite">{s.factoryAddress}</p>
                  {s.rejectionReason && s.verificationStatus === "rejected" ? <p className="mt-1 text-oxide">Rejected: {s.rejectionReason}</p> : null}
                </div>
                <div>
                  <p className="spec text-[10px] text-graphite">Documents</p>
                  {s.documents.length ? (
                    <ul>
                      {s.documents.map((d, i) => (
                        <li key={d.url}>
                          <a href={d.url} target="_blank" rel="noreferrer" className="underline">
                            {d.name ?? `Document ${i + 1}`} ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-graphite">None uploaded</p>
                  )}
                  <p className="spec mt-3 text-[10px] text-graphite">Payout details</p>
                  <p className="font-mono text-xs">{p ? (p.method === "upi" ? `UPI ${p.upiId}` : `${p.accountName} · ${p.accountNumber} · ${p.ifsc}`) : "—"}</p>
                </div>
                <div>
                  <p className="spec text-[10px] text-graphite">Impact</p>
                  <p className="font-mono">{s.totalKgDiverted.toFixed(1)} kg diverted</p>
                  <a href={`/api/supplier/certificate?supplierId=${s._id}`} target="_blank" rel="noreferrer" className="text-xs underline">
                    ESG certificate ↗
                  </a>
                </div>
              </div>
              <div className="border-t border-rule p-4">
                <SupplierControls id={s._id} status={s.verificationStatus} commission={s.commissionRate} />
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-4 mt-12 text-3xl">Payouts ledger</h2>
      <Table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Supplier</th>
            <th>Order</th>
            <th className="text-right">Gross</th>
            <th className="text-right">Commission</th>
            <th className="text-right">Payout</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {plain(payouts).map((p) => (
            <tr key={p._id}>
              <td className="text-xs">{formatDate(p.createdAt)}</td>
              <td>{(p.supplierId as unknown as { companyName?: string })?.companyName}</td>
              <td className="font-mono text-xs">{p.orderNumber}</td>
              <td className="text-right font-mono">{formatINR(p.gross)}</td>
              <td className="text-right font-mono">{formatINR(p.commission)}</td>
              <td className="text-right font-mono">{formatINR(p.amount)}</td>
              <td>{p.status === "pending" ? <MarkPaidButton id={p._id} /> : <span className="font-mono text-xs">paid · {p.reference}</span>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
