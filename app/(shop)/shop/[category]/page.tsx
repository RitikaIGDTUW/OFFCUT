import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/shop/catalog-view";
import { getCategories, type SearchParams } from "@/lib/catalog";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return { title: "Category not found" };
  return { title: `${cat.name} off-cuts`, description: cat.description ?? `Graded ${cat.name.toLowerCase()} off-cuts and dead-stock.` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const exists = (await getCategories()).some((c) => c.slug === category);
  if (!exists) notFound();
  return <CatalogView searchParams={await searchParams} categorySlug={category} />;
}
