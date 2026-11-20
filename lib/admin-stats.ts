import "server-only";
import type { PipelineStage } from "mongoose";
import { dbConnect } from "./db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { SupplierSubmission } from "@/models/misc";
import { getSettings } from "./settings";

const PAID: PipelineStage.Match["$match"] = { orderStatus: { $nin: ["cancelled", "returned"] }, paymentStatus: { $ne: "refunded" } };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function revenueSince(d: Date) {
  const [r] = await Order.aggregate<{ total: number; n: number }>([{ $match: { ...PAID, createdAt: { $gte: d } } }, { $group: { _id: null, total: { $sum: "$total" }, n: { $sum: 1 } } }]);
  return r ?? { total: 0, n: 0 };
}

/** All numbers for the admin dashboard in one call. */
export async function dashboardStats() {
  await dbConnect();
  const settings = await getSettings();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [today, week, month, newUsers, kg, lowStock, byStatus, byDay, topCats, pendingSubs] = await Promise.all([
    revenueSince(startOfDay),
    revenueSince(daysAgo(7)),
    revenueSince(daysAgo(30)),
    User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    Order.aggregate<{ kg: number }>([{ $match: PAID }, { $group: { _id: null, kg: { $sum: "$kgDiverted" } } }]),
    Product.find({ status: "active", quantityAvailable: { $lte: settings.lowStockThreshold } }).select("lotNumber title quantityAvailable").sort({ quantityAvailable: 1 }).limit(10).lean(),
    Order.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$orderStatus", n: { $sum: 1 } } }]),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: { ...PAID, createdAt: { $gte: daysAgo(30) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" } } },
    ]),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: PAID },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      { $lookup: { from: "categories", localField: "p.categoryId", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $group: { _id: "$c.name", revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    SupplierSubmission.find({ status: { $in: ["new", "reviewing"] } }).sort({ createdAt: -1 }).limit(5).populate("supplierId", "companyName").lean(),
  ]);

  // Fill missing days with 0 so the line is continuous.
  const map = new Map(byDay.map((d) => [d._id, d.revenue]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = daysAgo(29 - i);
    const key = d.toISOString().slice(0, 10);
    return { date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: Math.round(map.get(key) ?? 0) };
  });

  const recent = await Order.find().sort({ createdAt: -1 }).limit(8).select("orderNumber total orderStatus paymentStatus createdAt email").lean();

  return {
    kpi: {
      today: today.total,
      week: week.total,
      month: month.total,
      orders30: month.n,
      aov: month.n ? month.total / month.n : 0,
      newUsers,
      kgDiverted: kg[0]?.kg ?? 0,
      lowStockCount: lowStock.length,
    },
    series,
    byStatus: byStatus.map((s) => ({ name: s._id, value: s.n })).sort((a, b) => b.value - a.value),
    topCats: topCats.map((c) => ({ name: c._id, value: Math.round(c.revenue) })),
    lowStock,
    recent,
    pendingSubs,
  };
}
