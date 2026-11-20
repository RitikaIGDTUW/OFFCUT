import "server-only";
import { dbConnect } from "./db";
import { Category } from "@/models/Category";
import { Supplier } from "@/models/Supplier";

/** Dropdown options for admin forms. */
export async function catalogOptions() {
  await dbConnect();
  const [cats, sups] = await Promise.all([Category.find().sort({ order: 1 }).select("name parent").lean(), Supplier.find().select("companyName").sort({ companyName: 1 }).lean()]);
  const parents = new Map(cats.map((c) => [c._id.toString(), c.name]));
  return {
    categories: cats.map((c) => ({ _id: c._id.toString(), name: c.parent ? `${parents.get(c.parent.toString()) ?? ""} › ${c.name}` : c.name })),
    suppliers: sups.map((s) => ({ _id: s._id.toString(), name: s.companyName })),
  };
}
