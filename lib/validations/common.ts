import { z } from "zod";
import { BUYER_TYPES } from "@/lib/constants";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const fileRef = z.object({
  name: z.string().optional(),
  url: z.string().url(),
  key: z.string().optional(),
});
export type FileRefInput = z.infer<typeof fileRef>;

export const addressSchema = z.object({
  label: z.string().trim().max(30).default("Home"),
  fullName: z.string().trim().min(2, "Required").max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{8,15}$/, "Enter a valid phone number"),
  line1: z.string().trim().min(3, "Required").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Required").max(60),
  state: z.string().trim().min(2, "Required").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit PIN code"),
  country: z.string().trim().default("India"),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  buyerType: z.enum(BUYER_TYPES).optional(),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN is 15 characters")
    .optional()
    .or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Required").max(80),
  email: z.string().trim().email("Valid email please"),
  subject: z.string().trim().min(3, "Required").max(120),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
});

export const reviewSchema = z.object({
  productId: objectId,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3, "Add a short title").max(100),
  body: z.string().trim().min(10, "At least 10 characters").max(2000),
  photos: z.array(fileRef).max(3).default([]),
});

export const materialRequestSchema = z.object({
  material: z.string().trim().min(3, "What material?").max(120),
  dimensionsNeeded: z.string().trim().max(160).default(""),
  quantity: z.string().trim().max(80).default(""),
  budget: z.coerce.number().min(0).max(10_000_000).default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const newsletterSchema = z.object({ email: z.string().trim().toLowerCase().email() });
