import { z } from "zod";
import { fileRef } from "./common";

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(2, "Required").max(120),
  industry: z.string().trim().min(2, "Required").max(80),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN is 15 characters"),
  factoryAddress: z.string().trim().min(10, "Full address please").max(300),
  contactPerson: z.string().trim().min(2, "Required").max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{8,15}$/, "Valid phone number"),
  documents: z.array(fileRef).max(10).default([]),
  payoutMethod: z.enum(["bank", "upi"]),
  accountName: z.string().trim().max(80).default(""),
  accountNumber: z.string().trim().max(30).default(""),
  ifsc: z.string().trim().toUpperCase().max(11).default(""),
  upiId: z.string().trim().max(60).default(""),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

export const submissionSchema = z.object({
  material: z.string().trim().min(3, "What material is it?").max(120),
  categoryId: z.string().default(""),
  description: z.string().trim().min(10, "Describe grade, condition, origin").max(3000),
  approxQuantity: z.string().trim().min(1, "Required").max(120),
  approxDimensions: z.string().trim().min(1, "Required").max(160),
  approxWeightKg: z.coerce.number().min(0).max(1_000_000).default(0),
  photos: z.array(fileRef).min(1, "Add at least one photo").max(10),
  askingPrice: z.coerce.number().min(0).max(100_000_000).default(0),
  pickupAddress: z.string().trim().min(10, "Pickup address required").max(300),
});
export type SubmissionInput = z.input<typeof submissionSchema>;
