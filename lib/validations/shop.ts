import { z } from "zod";
import { addressSchema, objectId } from "./common";

export const cartLineSchema = z.object({ productId: objectId, qty: z.coerce.number().positive().max(100000) });
export const cartLinesSchema = z.array(cartLineSchema).max(100);

export const checkoutSchema = z.object({
  items: cartLinesSchema.min(1, "Your cart is empty"),
  address: addressSchema,
  saveAddress: z.boolean().default(false),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["razorpay", "cod"]),
  couponCode: z.string().trim().toUpperCase().max(30).optional().or(z.literal("")),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const verifyPaymentSchema = z.object({
  orderNumber: z.string().min(5),
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(10),
});
