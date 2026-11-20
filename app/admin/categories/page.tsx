import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await dbConnect();
  const [cats, counts] = await Promise.all([
    Category.find().sort({ order: 1 }).lean(),
    Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$categoryId", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  const rows = plain(cats).map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    image: c.image?.url ? { url: c.image.url, key: c.image.key } : null,
    parent: c.parent ?? "",
    isActive: c.isActive,
    count: byId.get(c._id) ?? 0,
  }));
  return (
    <>
      <PageHeader eyebrow="Catalogue" title={<>Categories</>}>
        Drag rows to reorder how categories appear in the shop. Subcategories roll up into their parent&apos;s listing.
      </PageHeader>
      <CategoryManager rows={rows} />
    </>
  );
}
