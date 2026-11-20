import { Schema, model, models, type Model, type Types } from "mongoose";
import { toMM, discountPct, type DimUnit } from "@/lib/utils";

import { CONDITIONS, UNIT_TYPES, PRODUCT_STATUS, GRADES, DIM_UNITS } from "@/lib/constants";
export { CONDITIONS, UNIT_TYPES, PRODUCT_STATUS, GRADES, DIM_UNITS };

export type Condition = (typeof CONDITIONS)[number];
export type UnitType = (typeof UNIT_TYPES)[number];
export type ProductStatus = (typeof PRODUCT_STATUS)[number];
export type Grade = (typeof GRADES)[number];

export interface IImage {
  url: string;
  key?: string;
  alt?: string;
}

/** A "Lot" — one catalogued batch of off-cut material. */
export interface IProduct {
  _id: Types.ObjectId;
  lotNumber: string;
  title: string;
  slug: string;
  description: string; // sanitised HTML
  categoryId: Types.ObjectId;
  supplierId?: Types.ObjectId | null;
  materialType: string;
  grade: Grade;
  gradeDetail?: string; // free text: "6061-T6", "Full-grain Italian"
  condition: Condition;
  dimensions: { length: number; width: number; thickness?: number | null; unit: DimUnit };
  dimsMm: { length: number; width: number; thickness: number }; // normalised for filtering
  areaMm2: number;
  isRoll: boolean;
  rollLength?: number | null; // metres
  weightKg: number; // weight of ONE unit
  quantityAvailable: number;
  soldQty: number;
  unitType: UnitType;
  sellByWeight: boolean; // when true `price` is per kg and qty is in kg
  price: number;
  compareAtRetailPrice?: number | null;
  discountPct: number;
  costPrice?: number | null; // ADMIN ONLY — select:false so public queries never see it
  colour?: string;
  finish?: string;
  origin?: string;
  certifications: string[];
  images: IImage[];
  specSheetPdf?: { url?: string; key?: string };
  tags: string[];
  sustainability: { kgDiverted: number; co2SavedKg: number };
  status: ProductStatus;
  featured: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

import { CO2_FACTOR, co2Factor } from "@/lib/co2";
export { CO2_FACTOR, co2Factor };

/** Derived numbers shown on the lot page and in admin preview. */
export function computeSustainability(weightKg: number, totalUnits: number, materialType: string) {
  const kg = Number((weightKg * Math.max(totalUnits, 1)).toFixed(2));
  return { kgDiverted: kg, co2SavedKg: Number((kg * co2Factor(materialType)).toFixed(1)) };
}

const ImageSchema = new Schema<IImage>(
  { url: { type: String, required: true }, key: String, alt: String },
  { _id: false },
);

const ProductSchema = new Schema<IProduct>(
  {
    lotNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
    materialType: { type: String, required: true },
    grade: { type: String, enum: GRADES, default: "A" },
    gradeDetail: String,
    condition: { type: String, enum: CONDITIONS, default: "offcut" },
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      thickness: { type: Number, default: null },
      unit: { type: String, enum: DIM_UNITS, default: "mm" },
    },
    dimsMm: { length: Number, width: Number, thickness: Number },
    areaMm2: { type: Number, default: 0 },
    isRoll: { type: Boolean, default: false },
    rollLength: { type: Number, default: null },
    weightKg: { type: Number, default: 0 },
    quantityAvailable: { type: Number, default: 1, min: 0 },
    soldQty: { type: Number, default: 0 },
    unitType: { type: String, enum: UNIT_TYPES, default: "piece" },
    sellByWeight: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 0 },
    compareAtRetailPrice: { type: Number, default: null },
    discountPct: { type: Number, default: 0 },
    costPrice: { type: Number, default: null, select: false },
    colour: String,
    finish: String,
    origin: String,
    certifications: [String],
    images: [ImageSchema],
    specSheetPdf: { url: String, key: String },
    tags: [String],
    sustainability: {
      kgDiverted: { type: Number, default: 0 },
      co2SavedKg: { type: Number, default: 0 },
    },
    status: { type: String, enum: PRODUCT_STATUS, default: "draft" },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** Keep derived / normalised fields in sync whenever a lot is saved. */
ProductSchema.pre("save", function (next) {
  const d = this.dimensions;
  const length = toMM(d.length, d.unit);
  const width = toMM(d.width, d.unit);
  this.dimsMm = { length, width, thickness: d.thickness ? toMM(d.thickness, d.unit) : 0 };
  this.areaMm2 = length * width;
  this.discountPct = discountPct(this.price, this.compareAtRetailPrice);
  const unitWeight = this.sellByWeight ? 1 : this.weightKg;
  this.sustainability = computeSustainability(
    unitWeight,
    this.quantityAvailable + this.soldQty,
    this.materialType,
  );
  if (this.status === "active" && this.quantityAvailable <= 0) this.status = "sold-out";
  if (this.status === "sold-out" && this.quantityAvailable > 0) this.status = "active";
  next();
});

ProductSchema.index(
  { title: "text", description: "text", tags: "text", materialType: "text", gradeDetail: "text" },
  { weights: { title: 10, tags: 5, materialType: 5, gradeDetail: 4, description: 1 }, name: "lot_text" },
);
ProductSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
ProductSchema.index({ status: 1, price: 1 });
ProductSchema.index({ status: 1, discountPct: -1 });
ProductSchema.index({ status: 1, "dimsMm.length": 1, "dimsMm.width": 1 });
ProductSchema.index({ supplierId: 1, status: 1 });

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct>) || model<IProduct>("Product", ProductSchema);
