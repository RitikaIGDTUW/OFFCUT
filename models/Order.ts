import { Schema, model, models, type Model, type Types } from "mongoose";

import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
export { ORDER_STATUS, PAYMENT_STATUS };
export type OrderStatus = (typeof ORDER_STATUS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** Items are SNAPSHOTS: later edits to the lot never change an existing order. */
export interface IOrderItem {
  productId: Types.ObjectId;
  supplierId?: Types.ObjectId | null;
  title: string;
  slug: string;
  lotNumber: string;
  image?: string;
  specs: string;
  unitType: string;
  sellByWeight: boolean;
  weightKg: number;
  price: number;
  qty: number;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IStatusEvent {
  status: string;
  note?: string;
  at: Date;
  by?: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  email: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  shippingMethod: "standard" | "express";
  subtotal: number;
  shipping: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  couponCode?: string;
  paymentMethod: "razorpay" | "cod";
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpayRefundId?: string;
  orderStatus: OrderStatus;
  statusHistory: IStatusEvent[];
  trackingNumber?: string;
  courier?: string;
  cancelRequest?: { reason: string; at: Date; resolved: boolean };
  returnRequest?: { reason: string; at: Date; resolved: boolean };
  stockRestored: boolean;
  kgDiverted: number;
  co2SavedKg: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", default: null },
    title: String,
    slug: String,
    lotNumber: String,
    image: String,
    specs: String,
    unitType: String,
    sellByWeight: Boolean,
    weightKg: Number,
    price: Number,
    qty: Number,
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: String,
    items: [OrderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
    shippingMethod: { type: String, enum: ["standard", "express"], default: "standard" },
    subtotal: Number,
    shipping: Number,
    tax: Number,
    taxRate: Number,
    discount: { type: Number, default: 0 },
    total: Number,
    couponCode: String,
    paymentMethod: { type: String, enum: ["razorpay", "cod"], required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: "pending", index: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: String,
    razorpayRefundId: String,
    orderStatus: { type: String, enum: ORDER_STATUS, default: "placed", index: true },
    statusHistory: [
      { _id: false, status: String, note: String, at: { type: Date, default: Date.now }, by: String },
    ],
    trackingNumber: String,
    courier: String,
    cancelRequest: { reason: String, at: Date, resolved: Boolean },
    returnRequest: { reason: String, at: Date, resolved: Boolean },
    stockRestored: { type: Boolean, default: false },
    kgDiverted: { type: Number, default: 0 },
    co2SavedKg: { type: Number, default: 0 },
  },
  { timestamps: true },
);
OrderSchema.index({ createdAt: -1 });

export const Order: Model<IOrder> = (models.Order as Model<IOrder>) || model<IOrder>("Order", OrderSchema);
