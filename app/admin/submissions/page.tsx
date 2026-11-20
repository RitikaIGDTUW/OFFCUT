import { dbConnect } from "@/lib/db";
import { SupplierSubmission } from "@/models/misc";
import "@/models/Supplier";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { SubmissionsKanban } from "@/components/admin/submissions-kanban";

export const metadata = { title: "Supplier submissions" };

export default async function SubmissionsAdminPage() {
  await dbConnect();
  const subs = plain(await SupplierSubmission.find().populate("supplierId", "companyName industry").sort({ createdAt: -1 }).lean());
  const cards = subs.map((s) => ({
    _id: s._id,
    material: s.material,
    supplier: (s.supplierId as unknown as { companyName?: string; industry?: string })?.companyName ?? "—",
    industry: (s.supplierId as unknown as { industry?: string })?.industry ?? "",
    description: s.description,
    approxQuantity: s.approxQuantity,
    approxDimensions: s.approxDimensions,
    approxWeightKg: s.approxWeightKg ?? 0,
    askingPrice: s.askingPrice ?? 0,
    pickupAddress: s.pickupAddress,
    photos: s.photos.map((p) => p.url),
    status: s.status,
    offer: s.adminOffer?.amount ?? null,
    supplierResponse: s.supplierResponse ?? null,
    notes: s.notes ?? "",
    linked: s.linkedProductIds.length,
    createdAt: s.createdAt,
  }));
  return (
    <>
      <PageHeader eyebrow="Sourcing" title={<>Submissions <em>board</em></>}>
        Drag cards between columns (or use the “Move to” menu). Sending an offer moves a card to <b>Offer sent</b>; the supplier accepts or declines from their portal.
      </PageHeader>
      <SubmissionsKanban cards={cards} />
    </>
  );
}
