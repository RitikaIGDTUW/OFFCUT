import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogOptions } from "@/lib/admin-options";
import { dbConnect } from "@/lib/db";
import { Product, type IProduct } from "@/models/Product";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit lot" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await dbConnect();
  // Admin-only page, so the hidden costPrice is selected explicitly.
  const p = await Product.findById(id).select("+costPrice").lean<IProduct>();
  if (!p) notFound();
  const opts = await catalogOptions();
  return (
    <>
      <PageHeader eyebrow={`LOT #${p.lotNumber}`} title={p.title}>
        <span className="flex items-center gap-3">
          <StatusBadge status={p.status} />
          {p.status === "active" || p.status === "sold-out" ? (
            <Link href={`/lot/${p.slug}`} target="_blank" className="text-sm underline">
              View on store ↗
            </Link>
          ) : null}
          <span className="font-mono text-xs">
            {p.views} views · {p.soldQty} sold
          </span>
        </span>
      </PageHeader>
      <ProductForm
        id={id}
        lotNumber={p.lotNumber}
        categories={opts.categories}
        suppliers={opts.suppliers}
        initial={{
          title: p.title,
          slug: p.slug,
          description: p.description,
          categoryId: p.categoryId.toString(),
          supplierId: p.supplierId?.toString() ?? "",
          materialType: p.materialType,
          grade: p.grade,
          gradeDetail: p.gradeDetail ?? "",
          condition: p.condition,
          dimensions: { length: p.dimensions.length, width: p.dimensions.width, thickness: p.dimensions.thickness ?? 0, unit: p.dimensions.unit },
          isRoll: p.isRoll,
          rollLength: p.rollLength ?? 0,
          weightKg: p.weightKg,
          quantityAvailable: p.quantityAvailable,
          unitType: p.unitType,
          sellByWeight: p.sellByWeight,
          price: p.price,
          compareAtRetailPrice: p.compareAtRetailPrice ?? 0,
          costPrice: p.costPrice ?? 0,
          colour: p.colour ?? "",
          finish: p.finish ?? "",
          origin: p.origin ?? "",
          certifications: p.certifications.join(", "),
          tags: p.tags.join(", "),
          images: p.images.map((i) => ({ url: i.url, key: i.key, alt: i.alt ?? "" })),
          specSheetPdf: p.specSheetPdf?.url ? { url: p.specSheetPdf.url, key: p.specSheetPdf.key } : null,
          status: p.status,
          featured: p.featured,
        }}
      />
    </>
  );
}
