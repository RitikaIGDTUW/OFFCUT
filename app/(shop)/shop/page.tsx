import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";
import type { SearchParams } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop all lots",
  description: "Filter graded off-cuts and dead-stock by material, grade, exact dimensions, weight and price.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <CatalogView searchParams={await searchParams} />;
}
