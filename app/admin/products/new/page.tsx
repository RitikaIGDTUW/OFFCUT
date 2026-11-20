import { catalogOptions } from "@/lib/admin-options";
import { dbConnect } from "@/lib/db";
import { SupplierSubmission } from "@/models/misc";
import { sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductInput } from "@/lib/validations/product";

export const metadata = { title: "New lot" };

/** New lot. With ?fromSubmission=<id> the form is pre-filled from a supplier submission ("Convert to lot"). */
export default async function NewProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const subId = sp((await searchParams).fromSubmission);
  const opts = await catalogOptions();
  let initial: Partial<ProductInput> | undefined;
  if (subId && /^[a-f\d]{24}$/i.test(subId)) {
    await dbConnect();
    const s = await SupplierSubmission.findById(subId).lean();
    if (s) {
      initial = {
        title: s.material,
        materialType: s.material.split(" ").slice(-1)[0] ?? s.material,
        description: `${s.description}\n\nApprox. dimensions at submission: ${s.approxDimensions}`,
        categoryId: s.categoryId?.toString() ?? opts.categories[0]?._id,
        supplierId: s.supplierId.toString(),
        costPrice: s.adminOffer?.amount ?? 0,
        images: s.photos.map((p) => ({ url: p.url, key: p.key, alt: s.material })),
        status: "draft",
      };
    }
  }
  return (
    <>
      <PageHeader eyebrow="Catalogue" title={subId ? <>Convert submission to <em>lot</em></> : <>New <em>lot</em></>}>
        {subId ? "Pre-filled from the supplier's submission — measure, grade and price it, then save." : null}
      </PageHeader>
      <ProductForm categories={opts.categories} suppliers={opts.suppliers} initial={initial} submissionId={initial ? subId : undefined} />
    </>
  );
}
