import { Schema, model, models, type Model, type Types } from "mongoose";

import { ROLES, BUYER_TYPES, type Role, type BuyerType } from "@/lib/constants";
export { ROLES, BUYER_TYPES, type Role, type BuyerType };

export interface IAddress {
  _id: Types.ObjectId;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  image?: string;
  imageKey?: string;
  role: Role;
  phone?: string;
  addresses: IAddress[];
  buyerType?: BuyerType;
  gstin?: string;
  wishlist: Types.ObjectId[];
  isBlocked: boolean;
  emailVerified?: Date | null;
  verifyTokenHash?: string;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  label: { type: String, default: "Home" },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // `select: false` means these secrets are never loaded unless explicitly asked for.
    passwordHash: { type: String, select: false },
    image: String,
    imageKey: String,
    role: { type: String, enum: ROLES, default: "buyer", index: true },
    phone: String,
    addresses: [AddressSchema],
    buyerType: { type: String, enum: BUYER_TYPES },
    gstin: String,
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    isBlocked: { type: Boolean, default: false },
    emailVerified: { type: Date, default: null },
    verifyTokenHash: { type: String, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
