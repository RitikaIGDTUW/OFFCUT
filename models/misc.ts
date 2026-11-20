/**
 * Smaller collections grouped in one file to keep the models folder readable:
 * Cart, SupplierSubmission, Review, Coupon, MaterialRequest, Notification,
 * AuditLog, ContactMessage, NewsletterSubscriber, StockAdjustment, Payout.
 */
import { Schema, model, models, type Model, type Types } from "mongoose";
import { FileRefSchema, type IFileRef } from "./Supplier";
import { SUBMISSION_STATUS } from "@/lib/constants";

/* ───────── Cart ───────── */
export interface ICartItem {
  productId: Types.ObjectId;
  qty: number;
  priceSnapshot: number;
}
export interface ICart {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}
const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        qty: { type: Number, min: 0.1 },
        priceSnapshot: Number,
      },
    ],
  },
  { timestamps: true },
);
export const Cart: Model<ICart> = (models.Cart as Model<ICart>) || model<ICart>("Cart", CartSchema);

/* ───────── Supplier submission ───────── */
export { SUBMISSION_STATUS };
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];
export interface ISupplierSubmission {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  material: string;
  categoryId?: Types.ObjectId | null;
  description: string;
  approxQuantity: string;
  approxDimensions: string;
  approxWeightKg?: number;
  photos: IFileRef[];
  askingPrice?: number;
  pickupAddress: string;
  status: SubmissionStatus;
  adminOffer?: { amount: number; message?: string; at: Date } | null;
  supplierResponse?: "accepted" | "declined" | null;
  notes?: string;
  statusHistory: { status: string; note?: string; at: Date }[];
  linkedProductIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
const SupplierSubmissionSchema = new Schema<ISupplierSubmission>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    material: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    description: String,
    approxQuantity: String,
    approxDimensions: String,
    approxWeightKg: Number,
    photos: [FileRefSchema],
    askingPrice: Number,
    pickupAddress: String,
    status: { type: String, enum: SUBMISSION_STATUS, default: "new", index: true },
    adminOffer: { type: { amount: Number, message: String, at: Date }, default: null, _id: false },
    supplierResponse: { type: String, enum: ["accepted", "declined", null], default: null },
    notes: String,
    statusHistory: [{ _id: false, status: String, note: String, at: { type: Date, default: Date.now } }],
    linkedProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true },
);
export const SupplierSubmission: Model<ISupplierSubmission> =
  (models.SupplierSubmission as Model<ISupplierSubmission>) ||
  model<ISupplierSubmission>("SupplierSubmission", SupplierSubmissionSchema);

/* ───────── Review ───────── */
export interface IReview {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  rating: number;
  title: string;
  body: string;
  photos: IFileRef[];
  verifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: Date;
}
const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    body: String,
    photos: [FileRefSchema],
    verifiedPurchase: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
export const Review: Model<IReview> =
  (models.Review as Model<IReview>) || model<IReview>("Review", ReviewSchema);

/* ───────── Coupon ───────── */
export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  description?: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxUses?: number | null;
  usedCount: number;
  perUserLimit: number;
  usedBy: { userId: Types.ObjectId; count: number }[];
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
}
const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    type: { type: String, enum: ["percent", "flat"], required: true },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: [{ _id: false, userId: { type: Schema.Types.ObjectId, ref: "User" }, count: Number }],
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const Coupon: Model<ICoupon> =
  (models.Coupon as Model<ICoupon>) || model<ICoupon>("Coupon", CouponSchema);

/* ───────── Material Wanted request ───────── */
export interface IMaterialRequest {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  material: string;
  dimensionsNeeded: string;
  quantity: string;
  budget?: number;
  notes?: string;
  status: "open" | "matched" | "closed";
  matchedProductIds: Types.ObjectId[];
  adminNote?: string;
  createdAt: Date;
}
const MaterialRequestSchema = new Schema<IMaterialRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    material: { type: String, required: true },
    dimensionsNeeded: String,
    quantity: String,
    budget: Number,
    notes: String,
    status: { type: String, enum: ["open", "matched", "closed"], default: "open" },
    matchedProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    adminNote: String,
  },
  { timestamps: true },
);
export const MaterialRequest: Model<IMaterialRequest> =
  (models.MaterialRequest as Model<IMaterialRequest>) ||
  model<IMaterialRequest>("MaterialRequest", MaterialRequestSchema);

/* ───────── Notification ───────── */
export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}
const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: String,
    body: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);

/* ───────── Audit log ───────── */
export interface IAuditLog {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: Date;
}
const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorEmail: String,
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ createdAt: -1 });
export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) || model<IAuditLog>("AuditLog", AuditLogSchema);

/* ───────── Contact message & newsletter ───────── */
export interface IContactMessage {
  _id: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  handled: boolean;
  createdAt: Date;
}
const ContactMessageSchema = new Schema<IContactMessage>(
  { name: String, email: String, subject: String, message: String, handled: { type: Boolean, default: false } },
  { timestamps: true },
);
export const ContactMessage: Model<IContactMessage> =
  (models.ContactMessage as Model<IContactMessage>) ||
  model<IContactMessage>("ContactMessage", ContactMessageSchema);

export interface INewsletter {
  _id: Types.ObjectId;
  email: string;
  createdAt: Date;
}
const NewsletterSchema = new Schema<INewsletter>(
  { email: { type: String, unique: true, lowercase: true } },
  { timestamps: true },
);
export const NewsletterSubscriber: Model<INewsletter> =
  (models.NewsletterSubscriber as Model<INewsletter>) ||
  model<INewsletter>("NewsletterSubscriber", NewsletterSchema);

/* ───────── Inventory adjustments ───────── */
export interface IStockAdjustment {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  lotNumber: string;
  delta: number;
  resultingQty: number;
  reason: string;
  by: string;
  createdAt: Date;
}
const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", index: true },
    lotNumber: String,
    delta: Number,
    resultingQty: Number,
    reason: String,
    by: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const StockAdjustment: Model<IStockAdjustment> =
  (models.StockAdjustment as Model<IStockAdjustment>) ||
  model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);

/* ───────── Supplier payouts ledger ───────── */
export interface IPayout {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  gross: number;
  commission: number;
  amount: number;
  status: "pending" | "paid";
  reference?: string;
  paidAt?: Date | null;
  createdAt: Date;
}
const PayoutSchema = new Schema<IPayout>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: String,
    gross: Number,
    commission: Number,
    amount: Number,
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    reference: String,
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
PayoutSchema.index({ supplierId: 1, orderId: 1 }, { unique: true, sparse: true });
export const Payout: Model<IPayout> =
  (models.Payout as Model<IPayout>) || model<IPayout>("Payout", PayoutSchema);
