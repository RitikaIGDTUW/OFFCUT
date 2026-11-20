import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { OnboardingWizard } from "@/components/supplier/supplier-forms";

export const metadata: Metadata = { title: "Supplier onboarding" };

export default async function OnboardingPage() {
  const user = await requirePageUser(["supplier", "admin"], "/supplier/onboarding");
  await dbConnect();
  const s = await Supplier.findOne({ userId: user.id }).select("+payoutDetails").lean();
  const p = s ? plain(s) : null;
  return (
    <>
      <PageHeader eyebrow="Supplier onboarding" title={p ? <>Company &amp; <em>payouts</em></> : <>Set up your <em>factory</em></>}>
        We verify every supplier&apos;s GSTIN and documents before the first pickup. Your payout details are only visible to you and OFFCUT
        administrators.
      </PageHeader>
      {user.role === "admin" && !p ? (
        <p className="text-graphite">Admins manage suppliers from the admin panel.</p>
      ) : (
        <OnboardingWizard
          initial={
            p
              ? {
                  companyName: p.companyName,
                  industry: p.industry,
                  gstin: p.gstin ?? "",
                  factoryAddress: p.factoryAddress ?? "",
                  contactPerson: p.contactPerson ?? "",
                  phone: p.phone ?? "",
                  documents: p.documents.map((d) => ({ url: d.url, key: d.key, name: d.name })),
                  payoutMethod: p.payoutDetails?.method ?? "upi",
                  accountName: p.payoutDetails?.accountName ?? "",
                  accountNumber: p.payoutDetails?.accountNumber ?? "",
                  ifsc: p.payoutDetails?.ifsc ?? "",
                  upiId: p.payoutDetails?.upiId ?? "",
                }
              : { contactPerson: user.name }
          }
        />
      )}
    </>
  );
}
