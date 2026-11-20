import { Schema, model, models, type Model, type Types } from "mongoose";

import { VERIFICATION } from "@/lib/constants";
export { VERIFICATION };
export type VerificationStatus = (typeof VERIFICATION)[number];

export interface IFileRef {
  name?: string;
  url: string;
  key?: string;
}
export interface IPayoutDetails {
  method: "bank" | "upi";
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export interface ISupplier {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  industry: string;
  gstin?: string;
  factoryAddress?: string;
  contactPerson?: string;
  phone?: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  onboardingComplete: boolean;
  documents: IFileRef[];
  /** Sensitive: only loaded with .select("+payoutDetails") for the supplier themself / admin. */
  payoutDetails?: IPayoutDetails;
  commissionRate: number; // % kept by OFFCUT
  totalKgDiverted: number;
  story?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const FileRefSchema = new Schema<IFileRef>(
  { name: String, url: { type: String, required: true }, key: String },
  { _id: false },
);

const SupplierSchema = new Schema<ISupplier>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true },
    industry: { type: String, required: true },
    gstin: String,
    factoryAddress: String,
    contactPerson: String,
    phone: String,
    verificationStatus: { type: String, enum: VERIFICATION, default: "pending", index: true },
    rejectionReason: String,
    onboardingComplete: { type: Boolean, default: false },
    documents: [FileRefSchema],
    payoutDetails: {
      type: new Schema<IPayoutDetails>(
        {
          method: { type: String, enum: ["bank", "upi"], default: "upi" },
          accountName: String,
          accountNumber: String,
          ifsc: String,
          upiId: String,
        },
        { _id: false },
      ),
      select: false,
    },
    commissionRate: { type: Number, default: 15 },
    totalKgDiverted: { type: Number, default: 0 },
    story: String,
  },
  { timestamps: true },
);

export const Supplier: Model<ISupplier> =
  (models.Supplier as Model<ISupplier>) || model<ISupplier>("Supplier", SupplierSchema);
