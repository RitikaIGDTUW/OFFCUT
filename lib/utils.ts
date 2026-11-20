import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Types } from "mongoose";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(Math.round(n || 0));
export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(n || 0);

export const formatDate = (d: string | Date | undefined | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const formatDateTime = (d: string | Date | undefined | null) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ───────── Units & dimensions ───────── */
export type DimUnit = "mm" | "cm" | "in" | "m";
export const MM_PER: Record<DimUnit, number> = { mm: 1, cm: 10, in: 25.4, m: 1000 };
export const toMM = (v: number, unit: DimUnit) => v * MM_PER[unit];
export const fromMM = (mm: number, unit: DimUnit) => mm / MM_PER[unit];

export function fmtLen(v: number | undefined | null, digits = 1) {
  if (v === undefined || v === null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(digits).replace(/\.0+$/, "");
}

export type Dimensions = { length: number; width: number; thickness?: number | null; unit: DimUnit };

/** "L 600 × W 140 × T 1.2 MM" (optionally converted to another unit) */
export function formatDims(d: Dimensions, target?: DimUnit) {
  const unit = target ?? d.unit;
  const c = (v: number) => fmtLen(fromMM(toMM(v, d.unit), unit), unit === "in" ? 2 : 1);
  const parts = [`L ${c(d.length)}`, `W ${c(d.width)}`];
  if (d.thickness) parts.push(`T ${c(d.thickness)}`);
  return `${parts.join(" × ")} ${unit.toUpperCase()}`;
}

export const discountPct = (price: number, retail?: number | null) =>
  retail && retail > price ? Math.round(((retail - price) / retail) * 100) : 0;

/* ───────── Serialisation ───────── */
/** Type of a Mongo document after JSON round-trip (ObjectId/Date → string). */
export type Plain<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Plain<U>[]
      : T extends object
        ? { [K in keyof T]: Plain<T[K]> }
        : T;

/** Converts lean Mongo docs to plain JSON so they can cross the server→client boundary. */
export function plain<T>(value: T): Plain<T> {
  return JSON.parse(JSON.stringify(value)) as Plain<T>;
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Read a string value from Next.js searchParams. */
export function sp(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
export function spNum(v: string | string[] | undefined): number | undefined {
  const s = sp(v);
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
