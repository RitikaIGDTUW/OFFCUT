import { z } from "zod";
import { CONDITIONS, DIM_UNITS, GRADES, PRODUCT_STATUS, UNIT_TYPES } from "@/lib/constants";
import { objectId } from "./common";

/** Admin create/edit form for a lot. Numbers use z.coerce so HTML inputs can send strings. */
export const productSchema = z.object({
  title: z.string().trim().min(4, "Title is too short").max(140),
  slug: z
    .string()
    .trim()
    .max(90)
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only")
    .default(""),
  description: z.string().max(20000).default(""),
  categoryId: objectId,
  supplierId: z.string().default(""),
  materialType: z.string().trim().min(2, "Required").max(80),
  grade: z.enum(GRADES),
  gradeDetail: z.string().trim().max(80).default(""),
  condition: z.enum(CONDITIONS),
  dimensions: z.object({
    length: z.coerce.number().positive("Length > 0"),
    width: z.coerce.number().positive("Width > 0"),
    thickness: z.coerce.number().min(0).default(0),
    unit: z.enum(DIM_UNITS),
  }),
  isRoll: z.boolean().default(false),
  rollLength: z.coerce.number().min(0).default(0),
  weightKg: z.coerce.number().min(0).default(0),
  quantityAvailable: z.coerce.number().min(0),
  unitType: z.enum(UNIT_TYPES),
  sellByWeight: z.boolean().default(false),
  price: z.coerce.number().positive("Price > 0"),
  compareAtRetailPrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  colour: z.string().trim().max(40).default(""),
  finish: z.string().trim().max(60).default(""),
  origin: z.string().trim().max(60).default(""),
  certifications: z.string().max(400).default(""), // comma separated in the form
  tags: z.string().max(400).default(""), // comma separated in the form
  images: z
    .array(z.object({ url: z.string().url(), key: z.string().optional(), alt: z.string().max(160).default("") }))
    .max(10)
    .default([]),
  specSheetPdf: z.object({ url: z.string().url(), key: z.string().optional() }).nullable().default(null),
  status: z.enum(PRODUCT_STATUS),
  featured: z.boolean().default(false),
});
export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/)
    .default(""),
  description: z.string().trim().max(400).default(""),
  image: z.object({ url: z.string().url(), key: z.string().optional() }).nullable().default(null),
  parent: z.string().default(""),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.input<typeof categorySchema>;
