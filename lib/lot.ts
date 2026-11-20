import "server-only";
import { cache } from "react";
import { dbConnect } from "./db";
import { plain } from "./utils";
import { getLots } from "./catalog";
import { getSettings } from "./settings";
import { Product, type IProduct } from "@/models/Product";
import { Category, type ICategory } from "@/models/Category";
import { Supplier } from "@/models/Supplier";
import { Review } from "@/models/misc";
import { Order } from "@/models/Order";
import { User } from "@/models/User";

/** Everything the lot page needs. costPrice is never selected (select:false on the schema). */
export const getLotBySlug = cache(async (slug: string) => {
  await dbConnect();
  const p = await Product.findOne({ slug, status: { $in: ["active", "sold-out"] } }).lean<IProduct>();
  if (!p) return null;
  const [category, supplier, settings] = await Promise.all([
    Category.findById(p.categoryId).select("name slug").lean<ICategory>(),
    p.supplierId ? Supplier.findById(p.supplierId).select("companyName industry").lean() : null,
    getSettings(),
  ]);
  return plain({
    ...p,
    category,
    // Supplier identity is anonymised unless the admin enabled "show supplier names".
    supplier: supplier ? { industry: supplier.industry, name: settings.showSupplierNames ? supplier.companyName : null } : null,
  });
});
export type LotDetail = NonNullable<Awaited<ReturnType<typeof getLotBySlug>>>;

export async function getLotExtras(productId: string, categoryId: string, userId?: string) {
  await dbConnect();
  const [reviews, related, purchased, user, myReview] = await Promise.all([
    Review.find({ productId, isApproved: true }).sort({ createdAt: -1 }).limit(30).lean(),
    getLots({ categoryId, _id: { $ne: productId } }, { featured: -1, createdAt: -1 }, 4),
    userId ? Order.exists({ userId, "items.productId": productId, orderStatus: { $nin: ["cancelled"] } }) : null,
    userId ? User.findById(userId).select("wishlist").lean() : null,
    userId ? Review.exists({ productId, userId }) : null,
  ]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return {
    reviews: plain(reviews),
    rating: { avg: Math.round(avg * 10) / 10, count: reviews.length },
    related,
    hasPurchased: Boolean(purchased),
    hasReviewed: Boolean(myReview),
    inWishlist: Boolean(user?.wishlist?.some((w) => w.toString() === productId)),
  };
}

/** Fire-and-forget view counter. */
export async function bumpViews(productId: string) {
  try {
    await Product.updateOne({ _id: productId }, { $inc: { views: 1 } });
  } catch {
    /* ignore */
  }
}
