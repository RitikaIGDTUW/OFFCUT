import "server-only";
import { unstable_cache } from "next/cache";
import type { FilterQuery, SortOrder, Types } from "mongoose";
import { dbConnect } from "./db";
import { escapeRegex, plain, sp, spNum, type Plain } from "./utils";
import { Product, type IProduct } from "@/models/Product";
import { Category, type ICategory } from "@/models/Category";
import { Order } from "@/models/Order";
import { Supplier } from "@/models/Supplier";
import { getSettings } from "./settings";

/** Fields a product card / list row needs — never includes costPrice. */
const CARD_FIELDS =
  "lotNumber title slug grade gradeDetail condition dimensions isRoll rollLength weightKg unitType sellByWeight price compareAtRetailPrice discountPct images quantityAvailable status categoryId materialType colour featured createdAt sustainability";

type CardDoc = Pick<
  IProduct,
  | "_id"
  | "lotNumber"
  | "title"
  | "slug"
  | "grade"
  | "gradeDetail"
  | "condition"
  | "dimensions"
  | "isRoll"
  | "rollLength"
  | "weightKg"
  | "unitType"
  | "sellByWeight"
  | "price"
  | "compareAtRetailPrice"
  | "discountPct"
  | "images"
  | "quantityAvailable"
  | "status"
  | "materialType"
  | "colour"
  | "featured"
  | "createdAt"
  | "sustainability"
> & { categoryId: { _id: Types.ObjectId; name: string; slug: string } | null };

export type LotCard = Plain<CardDoc>;

export const SORTS = {
  newest: { label: "Newest", sort: { createdAt: -1 } },
  "price-asc": { label: "Price ↑", sort: { price: 1 } },
  "price-desc": { label: "Price ↓", sort: { price: -1 } },
  discount: { label: "Biggest discount", sort: { discountPct: -1 } },
  size: { label: "Largest size", sort: { areaMm2: -1 } },
  weight: { label: "Heaviest", sort: { weightKg: -1 } },
} as const satisfies Record<string, { label: string; sort: Record<string, SortOrder> }>;
export type SortKey = keyof typeof SORTS;

export type SearchParams = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) =>
  (sp(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const PAGE_SIZE = 24;

/** Builds the MongoDB filter from URL search params (all filters are URL-synced). */
export async function buildCatalogFilter(params: SearchParams, categorySlug?: string) {
  await dbConnect();
  const filter: FilterQuery<IProduct> = { status: { $in: ["active", "sold-out"] } };

  const slug = categorySlug ?? sp(params.category);
  let category: Plain<ICategory> | null = null;
  if (slug) {
    const cat = await Category.findOne({ slug, isActive: true }).lean();
    if (cat) {
      category = plain(cat);
      const children = await Category.find({ parent: cat._id }).select("_id").lean();
      filter.categoryId = { $in: [cat._id, ...children.map((c) => c._id)] };
    } else {
      filter._id = null; // unknown category → no results
    }
  }

  const materials = list(params.material);
  if (materials.length) filter.materialType = { $in: materials.map((m) => new RegExp(`^${escapeRegex(m)}$`, "i")) };
  const grades = list(params.grade);
  if (grades.length) filter.grade = { $in: grades };
  const conditions = list(params.condition);
  if (conditions.length) filter.condition = { $in: conditions };
  const colours = list(params.colour);
  if (colours.length) filter.colour = { $in: colours };
  const units = list(params.unit);
  if (units.length) filter.unitType = { $in: units };

  const minL = spNum(params.minL);
  const minW = spNum(params.minW);
  const minT = spNum(params.minT);
  const maxT = spNum(params.maxT);
  if (minL) filter["dimsMm.length"] = { $gte: minL };
  if (minW) filter["dimsMm.width"] = { $gte: minW };
  if (minT || maxT) filter["dimsMm.thickness"] = { ...(minT ? { $gte: minT } : {}), ...(maxT ? { $lte: maxT } : {}) };

  const minKg = spNum(params.minKg);
  const maxKg = spNum(params.maxKg);
  if (minKg || maxKg) filter.weightKg = { ...(minKg ? { $gte: minKg } : {}), ...(maxKg ? { $lte: maxKg } : {}) };
  const minP = spNum(params.minPrice);
  const maxP = spNum(params.maxPrice);
  if (minP || maxP) filter.price = { ...(minP ? { $gte: minP } : {}), ...(maxP ? { $lte: maxP } : {}) };

  if (sp(params.inStock) === "1") {
    filter.status = "active";
    filter.quantityAvailable = { $gt: 0 };
  }
  if (sp(params.byWeight) === "1") filter.sellByWeight = true;

  const q = sp(params.q)?.trim();
  if (q) filter.$text = { $search: q };

  return { filter, category };
}

export async function getCatalog(params: SearchParams, categorySlug?: string) {
  const { filter, category } = await buildCatalogFilter(params, categorySlug);
  const sortKey = (sp(params.sort) as SortKey) ?? "newest";
  const sort = SORTS[sortKey]?.sort ?? SORTS.newest.sort;
  const page = Math.max(1, spNum(params.page) ?? 1);

  const [docs, total] = await Promise.all([
    Product.find(filter)
      .select(CARD_FIELDS)
      .populate("categoryId", "name slug")
      .sort({ ...sort, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<CardDoc[]>(),
    Product.countDocuments(filter),
  ]);
  return { items: plain(docs), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), category };
}

/** Values for the filter sidebar. */
export const getFacets = unstable_cache(async () => {
  await dbConnect();
  const live = { status: { $in: ["active", "sold-out"] } };
  const [materials, colours, maxes] = await Promise.all([
    Product.distinct("materialType", live),
    Product.distinct("colour", live),
    Product.aggregate<{ price: number; kg: number; len: number; wid: number; thick: number }>([
      { $match: live },
      {
        $group: {
          _id: null,
          price: { $max: "$price" },
          kg: { $max: "$weightKg" },
          len: { $max: "$dimsMm.length" },
          wid: { $max: "$dimsMm.width" },
          thick: { $max: "$dimsMm.thickness" },
        },
      },
    ]),
  ]);
  const m = maxes[0] ?? { price: 10000, kg: 50, len: 3000, wid: 2000, thick: 100 };
  return {
    materials: (materials as string[]).filter(Boolean).sort(),
    colours: (colours as string[]).filter(Boolean).sort(),
    max: {
      price: Math.ceil(m.price / 100) * 100,
      kg: Math.ceil(m.kg),
      len: Math.ceil(m.len / 100) * 100,
      wid: Math.ceil(m.wid / 100) * 100,
      thick: Math.ceil(m.thick),
    },
  };
}, ["facets"], { tags: ["catalog"], revalidate: 300 });

export const getCategories = unstable_cache(async () => {
  await dbConnect();
  const cats = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
  const counts = await Product.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { status: "active" } },
    { $group: { _id: "$categoryId", n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return plain(cats).map((c) => ({ ...c, count: byId.get(c._id) ?? 0 }));
}, ["categories"], { tags: ["catalog"], revalidate: 300 });
export type CategoryWithCount = Awaited<ReturnType<typeof getCategories>>[number];

export async function getLots(filter: FilterQuery<IProduct>, sort: Record<string, SortOrder>, limit: number) {
  await dbConnect();
  const docs = await Product.find({ status: "active", ...filter })
    .select(CARD_FIELDS)
    .populate("categoryId", "name slug")
    .sort(sort)
    .limit(limit)
    .lean<CardDoc[]>();
  return plain(docs);
}

/** Site-wide sustainability numbers used in the header ticker and homepage bento. */
export const getImpactStats = unstable_cache(async () => {
  await dbConnect();
  const settings = await getSettings();
  const [agg, suppliers, liveLots] = await Promise.all([
    Order.aggregate<{ kg: number; co2: number; lots: number; orders: number }>([
      { $match: { orderStatus: { $nin: ["cancelled", "returned"] } } },
      {
        $group: {
          _id: null,
          kg: { $sum: "$kgDiverted" },
          co2: { $sum: "$co2SavedKg" },
          lots: { $sum: { $size: "$items" } },
          orders: { $sum: 1 },
        },
      },
    ]),
    Supplier.countDocuments({ verificationStatus: "verified" }),
    Product.countDocuments({ status: "active" }),
  ]);
  const a = agg[0] ?? { kg: 0, co2: 0, lots: 0, orders: 0 };
  const kg = a.kg + (settings.landfillOffsetKg ?? 0);
  return {
    kgDiverted: kg,
    // The admin-set offset represents material diverted before the platform went live;
    // its CO2 is estimated with a blended average factor (4.2 kg CO2e per kg).
    co2SavedKg: a.co2 + (settings.landfillOffsetKg ?? 0) * 4.2,
    lotsSold: a.lots,
    partnerFactories: suppliers,
    liveLots,
  };
}, ["impact"], { tags: ["catalog", "orders"], revalidate: 300 });
