import "server-only";
import { Types } from "mongoose";
import { dbConnect } from "./db";
import { Order } from "@/models/Order";

/** Gamified impact levels shown on the buyer dashboard. */
export const IMPACT_LEVELS = [
  { min: 0, name: "Scrap Scout", next: 10 },
  { min: 10, name: "Off-cut Champion", next: 50 },
  { min: 50, name: "Landfill Diverter", next: 200 },
  { min: 200, name: "Circular Legend", next: Infinity },
] as const;

export function impactLevel(kg: number) {
  const level = [...IMPACT_LEVELS].reverse().find((l) => kg >= l.min) ?? IMPACT_LEVELS[0];
  const progress = level.next === Infinity ? 100 : Math.min(100, ((kg - level.min) / (level.next - level.min)) * 100);
  return { ...level, progress };
}

export async function userImpact(userId: string) {
  await dbConnect();
  const [agg] = await Order.aggregate<{ kg: number; co2: number; orders: number; spent: number }>([
    { $match: { userId: new Types.ObjectId(userId), orderStatus: { $nin: ["cancelled", "returned"] } } },
    { $group: { _id: null, kg: { $sum: "$kgDiverted" }, co2: { $sum: "$co2SavedKg" }, orders: { $sum: 1 }, spent: { $sum: "$total" } } },
  ]);
  return agg ?? { kg: 0, co2: 0, orders: 0, spent: 0 };
}
