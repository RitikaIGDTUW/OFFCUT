import type { Metadata } from "next";
import { requireSupplierProfile } from "@/lib/supplier";
import { getCategories } from "@/lib/catalog";
import { PageHeader } from "@/components/ui/primitives";
import { SubmissionForm } from "@/components/supplier/supplier-forms";

export const metadata: Metadata = { title: "Submit off-cuts" };

export default async function SubmitPage() {
  const { supplier } = await requireSupplierProfile();
  const categories = (await getCategories()).filter((c) => !c.parent).map((c) => ({ _id: c._id, name: c.name }));
  return (
    <>
      <PageHeader eyebrow="New submission" title={<>Submit <em>off-cuts</em></>}>
        Photos and rough sizes are enough — we measure everything precisely after pickup.
      </PageHeader>
      {supplier.verificationStatus !== "verified" ? (
        <p className="border border-signal p-4 text-sm">Your account is awaiting verification. You can fill this in, but submitting is enabled once verified.</p>
      ) : null}
      <div className="mt-6">
        <SubmissionForm categories={categories} defaultPickup={supplier.factoryAddress ?? ""} />
      </div>
    </>
  );
}
