import { Schema, model, models, type Model, type Types } from "mongoose";

/** Singleton document (key = "global") holding store-wide, admin-editable settings. */
export interface ISettings {
  _id: Types.ObjectId;
  key: string;
  shipping: {
    mode: "flat" | "free-above" | "per-kg";
    flatRate: number;
    freeAbove: number;
    perKgRate: number;
    expressSurcharge: number;
  };
  taxRate: number;
  codEnabled: boolean;
  hero: { eyebrow: string; title: string; subtitle: string; images: string[] };
  announcement: string;
  landfillOffsetKg: number;
  lowStockThreshold: number;
  showSupplierNames: boolean;
  contact: { email: string; phone: string; address: string };
  social: { instagram: string; linkedin: string; x: string };
  seo: { title: string; description: string };
  faq: { q: string; a: string }[];
  updatedAt: Date;
}

export const DEFAULT_SETTINGS: Omit<ISettings, "_id" | "updatedAt"> = {
  key: "global",
  shipping: { mode: "free-above", flatRate: 99, freeAbove: 2999, perKgRate: 40, expressSurcharge: 149 },
  taxRate: 18,
  codEnabled: true,
  hero: {
    eyebrow: "Dead-stock & off-cut material exchange",
    title: "Industrial-grade leftovers. Maker-grade prices.",
    subtitle:
      "We buy high-grade off-cuts from tanneries, mills and machine shops, measure every lot to the millimetre, and sell them to people who build things.",
    images: [],
  },
  announcement: "Free shipping on lots over ₹2,999 · New: aerospace aluminium drop every Friday",
  landfillOffsetKg: 12000,
  lowStockThreshold: 3,
  showSupplierNames: false,
  contact: { email: "hello@offcut.test", phone: "+91 98765 43210", address: "Unit 7, Okhla Phase II, New Delhi 110020" },
  social: { instagram: "https://instagram.com", linkedin: "https://linkedin.com", x: "https://x.com" },
  seo: {
    title: "OFFCUT — Industrial-grade leftovers. Maker-grade prices.",
    description:
      "Buy graded, measured off-cuts and dead-stock — leather, technical fabrics, aluminium, hardwood, marble, acrylic and carbon fibre — from Indian factories.",
  },
  faq: [],
};

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, unique: true, default: "global" },
    shipping: {
      mode: { type: String, enum: ["flat", "free-above", "per-kg"], default: "free-above" },
      flatRate: Number,
      freeAbove: Number,
      perKgRate: Number,
      expressSurcharge: Number,
    },
    taxRate: Number,
    codEnabled: Boolean,
    hero: { eyebrow: String, title: String, subtitle: String, images: [String] },
    announcement: String,
    landfillOffsetKg: Number,
    lowStockThreshold: Number,
    showSupplierNames: Boolean,
    contact: { email: String, phone: String, address: String },
    social: { instagram: String, linkedin: String, x: String },
    seo: { title: String, description: String },
    faq: [{ _id: false, q: String, a: String }],
  },
  { timestamps: true },
);

export const Settings: Model<ISettings> =
  (models.Settings as Model<ISettings>) || model<ISettings>("Settings", SettingsSchema);
