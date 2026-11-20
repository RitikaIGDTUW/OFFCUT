import Papa from "papaparse";
import { NextResponse } from "next/server";
import type { FilterQuery } from "mongoose";
import { getSessionUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Order, type IOrder } from "@/models/Order";
import "@/models/Category";
import { User } from "@/models/User";

/**
 * CSV exports (admin only):
 *   ?type=products
 *   ?type=sales&from=YYYY-MM-DD&to=YYYY-MM-DD   (one row per order line, for reports)
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  await dbConnect();
  const dbUser = await User.findById(user.id).select("role isBlocked").lean();
  if (dbUser?.role !== "admin" || dbUser.isBlocked) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  let rows: Record<string, string | number | boolean>[] = [];

  if (type === "products") {
    const docs = await Product.find().select("+costPrice").populate("categoryId", "name").lean();
    rows = docs.map((p) => ({
      lotNumber: p.lotNumber,
      title: p.title,
      category: (p.categoryId as unknown as { name?: string })?.name ?? "",
      materialType: p.materialType,
      grade: p.grade,
      gradeDetail: p.gradeDetail ?? "",
      condition: p.condition,
      length: p.dimensions.length,
      width: p.dimensions.width,
      thickness: p.dimensions.thickness ?? "",
      unit: p.dimensions.unit,
      weightKg: p.weightKg,
      quantity: p.quantityAvailable,
      unitType: p.unitType,
      sellByWeight: p.sellByWeight,
      price: p.price,
      retailPrice: p.compareAtRetailPrice ?? "",
      costPrice: p.costPrice ?? "",
      colour: p.colour ?? "",
      finish: p.finish ?? "",
      origin: p.origin ?? "",
      tags: p.tags.join(", "),
      imageUrl: p.images[0]?.url ?? "",
      status: p.status,
      soldQty: p.soldQty,
      views: p.views,
    }));
  } else if (type === "sales") {
    const filter: FilterQuery<IOrder> = { orderStatus: { $nin: ["cancelled", "returned"] } };
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59`) } : {}) };
    const orders = await Order.find(filter).sort({ createdAt: 1 }).lean();
    rows = orders.flatMap((o) =>
      o.items.map((i) => ({
        date: o.createdAt.toISOString().slice(0, 10),
        orderNumber: o.orderNumber,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        lotNumber: i.lotNumber,
        title: i.title,
        qty: i.qty,
        unitPrice: i.price,
        lineTotal: i.price * i.qty,
        supplierId: i.supplierId?.toString() ?? "",
      })),
    );
  } else {
    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  return new Response(Papa.unparse(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offcut-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
