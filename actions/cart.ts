"use server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { getSessionUser } from "@/lib/guards";
import { cartLinesSchema } from "@/lib/validations/shop";
import { formatDims } from "@/lib/utils";
import { Product, type IProduct } from "@/models/Product";
import { Cart } from "@/models/misc";
import type { CartItem } from "@/store/cart";

type Line = { productId: string; qty: number };

/** Turns {productId, qty} lines into fresh cart items using CURRENT price & stock from MongoDB. */
async function enrich(lines: Line[]): Promise<CartItem[]> {
  await dbConnect();
  const ids = lines.map((l) => l.productId).filter((id) => Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: ids }, status: { $in: ["active", "sold-out"] } })
    .select("title slug lotNumber images price quantityAvailable unitType sellByWeight weightKg dimensions status")
    .lean<IProduct[]>();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  const out: CartItem[] = [];
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p || p.quantityAvailable <= 0) continue; // drop sold-out / removed lots
    out.push({
      productId: l.productId,
      slug: p.slug,
      title: p.title,
      lotNumber: p.lotNumber,
      image: p.images[0]?.url,
      price: p.price,
      qty: Math.min(l.qty, p.quantityAvailable),
      max: p.quantityAvailable,
      unitType: p.unitType,
      sellByWeight: p.sellByWeight,
      weightKg: p.weightKg,
      specs: formatDims(p.dimensions),
    });
  }
  return out;
}

/** Public: validate a (guest) cart against current stock/prices. */
export async function validateCart(lines: Line[]) {
  const parsed = cartLinesSchema.safeParse(lines);
  if (!parsed.success) return [];
  return enrich(parsed.data);
}

/**
 * Logged-in users: persist the cart in MongoDB.
 * `merge = true` is used right after login — guest (localStorage) lines are merged with the saved cart.
 */
export async function syncCart(lines: Line[], merge: boolean): Promise<CartItem[] | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const parsed = cartLinesSchema.safeParse(lines);
  if (!parsed.success) return null;
  await dbConnect();

  let finalLines: Line[] = parsed.data;
  if (merge) {
    const saved = await Cart.findOne({ userId: user.id }).lean();
    const map = new Map<string, number>();
    for (const i of saved?.items ?? []) map.set(i.productId.toString(), i.qty);
    for (const l of parsed.data) map.set(l.productId, Math.max(map.get(l.productId) ?? 0, l.qty));
    finalLines = [...map].map(([productId, qty]) => ({ productId, qty }));
  }
  const items = await enrich(finalLines);
  await Cart.findOneAndUpdate(
    { userId: user.id },
    { items: items.map((i) => ({ productId: i.productId, qty: i.qty, priceSnapshot: i.price })) },
    { upsert: true },
  );
  return items;
}
