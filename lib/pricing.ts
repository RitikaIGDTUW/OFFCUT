/**
 * Pure pricing maths shared by the cart UI (estimates) and the server (authoritative).
 * The server ALWAYS recomputes with fresh DB prices — the browser's numbers are only a preview.
 */
export type PricedLine = { price: number; qty: number; weightKg: number; sellByWeight: boolean };
export type ShippingRules = {
  mode: "flat" | "free-above" | "per-kg";
  flatRate: number;
  freeAbove: number;
  perKgRate: number;
  expressSurcharge: number;
};
export type CouponLike = { type: "percent" | "flat"; value: number; code: string } | null;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineWeight(l: PricedLine) {
  return l.sellByWeight ? l.qty : l.weightKg * l.qty;
}

export function computeShipping(
  subtotal: number,
  totalKg: number,
  rules: ShippingRules,
  method: "standard" | "express",
) {
  let base: number;
  if (rules.mode === "flat") base = rules.flatRate;
  else if (rules.mode === "free-above") base = subtotal >= rules.freeAbove ? 0 : rules.flatRate;
  else base = Math.max(rules.flatRate, Math.ceil(totalKg) * rules.perKgRate);
  return round2(base + (method === "express" ? rules.expressSurcharge : 0));
}

export function computeTotals(
  lines: PricedLine[],
  rules: ShippingRules,
  taxRate: number,
  coupon: CouponLike,
  method: "standard" | "express" = "standard",
) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const totalKg = round2(lines.reduce((s, l) => s + lineWeight(l), 0));
  let discount = 0;
  if (coupon) {
    discount = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
    discount = round2(Math.min(discount, subtotal));
  }
  const shipping = lines.length ? computeShipping(subtotal - discount, totalKg, rules, method) : 0;
  // GST applies to goods after discount (shipping shown separately, GST-inclusive).
  const tax = round2(((subtotal - discount) * taxRate) / 100);
  const total = round2(subtotal - discount + tax + shipping);
  return { subtotal, discount, shipping, tax, total, totalKg };
}

/** Very small pincode → zone estimate for the cart page shipping estimator. */
export function deliveryEstimate(pincode: string) {
  if (!/^\d{6}$/.test(pincode)) return null;
  const first = Number(pincode[0]);
  const zones: Record<number, [string, number]> = {
    1: ["North (Delhi NCR, Punjab, Haryana)", 3],
    2: ["North (UP, Uttarakhand)", 4],
    3: ["West (Rajasthan, Gujarat)", 4],
    4: ["West (Maharashtra, Goa, MP)", 3],
    5: ["South (Telangana, AP, Karnataka)", 5],
    6: ["South (Tamil Nadu, Kerala)", 5],
    7: ["East (West Bengal, Odisha, North-East)", 6],
    8: ["East (Bihar, Jharkhand)", 6],
    9: ["Army Post Office", 8],
  };
  const z = zones[first];
  if (!z) return null;
  return { zone: z[0], days: z[1] };
}
