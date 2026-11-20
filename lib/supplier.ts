import "server-only";
import { redirect } from "next/navigation";
import { requirePageUser } from "./guards";
import { dbConnect } from "./db";
import { Supplier } from "@/models/Supplier";
import { plain } from "./utils";

/** Loads the signed-in supplier's profile, sending them to onboarding if it doesn't exist yet. */
export async function requireSupplierProfile({ allowIncomplete = false, withPayout = false } = {}) {
  const user = await requirePageUser(["supplier", "admin"], "/supplier");
  await dbConnect();
  const q = Supplier.findOne({ userId: user.id });
  if (withPayout) q.select("+payoutDetails");
  const s = await q.lean();
  if (!s || (!s.onboardingComplete && !allowIncomplete)) {
    if (user.role === "admin") redirect("/admin/suppliers");
    redirect("/supplier/onboarding");
  }
  return { user, supplier: plain(s) };
}
