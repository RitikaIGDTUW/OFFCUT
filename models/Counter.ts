import { Schema, model, models, type Model } from "mongoose";

/** Atomic sequence counters used for human-friendly numbers (LOT #A-0001, OC-2026-000123). */
interface ICounter {
  _id: string;
  seq: number;
}
const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) || model<ICounter>("Counter", CounterSchema);

export async function nextSeq(name: string): Promise<number> {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return c.seq;
}
export async function nextLotNumber() {
  return `A-${String(await nextSeq("lot")).padStart(4, "0")}`;
}
export async function nextOrderNumber() {
  const year = new Date().getFullYear();
  return `OC-${year}-${String(await nextSeq(`order-${year}`)).padStart(6, "0")}`;
}
