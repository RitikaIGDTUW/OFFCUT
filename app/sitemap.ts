import type { MetadataRoute } from "next";
import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL;
  const pages = ["", "/shop", "/about", "/how-it-works", "/sustainability", "/faq", "/contact", "/shipping-returns", "/suppliers", "/terms", "/privacy"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
  try {
    await dbConnect();
    const [lots, cats] = await Promise.all([
      Product.find({ status: { $in: ["active", "sold-out"] } }).select("slug updatedAt").lean(),
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);
    return [
      ...pages,
      ...cats.map((c) => ({ url: `${base}/shop/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
      ...lots.map((l) => ({ url: `${base}/lot/${l.slug}`, lastModified: l.updatedAt, priority: 0.8 })),
    ];
  } catch {
    return pages;
  }
}
