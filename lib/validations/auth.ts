import { z } from "zod";
import { BUYER_TYPES } from "@/lib/constants";

export const email = z.string().trim().toLowerCase().email("Enter a valid email");
export const password = z
  .string()
  .min(8, "At least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required").max(72) });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email,
    password,
    confirm: z.string(),
    buyerType: z.enum(BUYER_TYPES),
    accountType: z.enum(["buyer", "supplier"]).default("buyer"),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ token: z.string().min(10), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Required"), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
