import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import "@/models/Category";
import { getCategories } from "@/lib/catalog";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata = { title: "Lots" };

export default async function AdminProductsPage() {
  await dbConnect();
  const [docs, cats] = await Promise.all([
    Product.find()
      .select("lotNumber title slug price quantityAvailable status featured views soldQty discountPct images categoryId createdAt")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean(),
    getCategories(),
  ]);
  const rows = plain(docs).map((d) => ({
    _id: d._id,
    lotNumber: d.lotNumber,
    title: d.title,
    slug: d.slug,
    price: d.price,
    qty: d.quantityAvailable,
    status: d.status,
    featured: d.featured,
    views: d.views,
    sold: d.soldQty,
    discount: d.discountPct,
    image: d.images[0]?.url ?? "",
    category: (d.categoryId as unknown as { name?: string } | null)?.name ?? "—",
  }));
  return (
    <>
      <PageHeader eyebrow="Catalogue" title={<>Lots <span className="font-mono text-2xl text-graphite">({rows.length})</span></>}>
        <Button asChild variant="signal">
          <Link href="/admin/products/new">+ New lot</Link>
        </Button>
      </PageHeader>
      <ProductsTable rows={rows} categories={cats.map((c) => ({ _id: c._id, name: c.name }))} />
    </>
  );
}
