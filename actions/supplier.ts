"use server";
import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { actionError, assertRole, assertSupplier } from "@/lib/guards";
import { cleanText } from "@/lib/sanitize";
import { deleteUploadedFiles, removedKeys } from "@/lib/utapi";
import { sendEmail, siteUrl } from "@/lib/email";
import { objectId } from "@/lib/validations/common";
import { onboardingSchema, submissionSchema } from "@/lib/validations/supplier";
import { Supplier } from "@/models/Supplier";
import { SupplierSubmission } from "@/models/misc";
import { SubmissionReceivedEmail } from "@/components/emails/templates";
import type { ActionResult } from "@/lib/utils";

/** Onboarding wizard: company details, GSTIN, documents, payout details → "pending verification". */
export async function saveOnboarding(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertRole(["supplier"]);
    const d = onboardingSchema.parse(input);
    if (d.payoutMethod === "upi" && !/^[\w.-]+@[\w]+$/.test(d.upiId)) return { ok: false, error: "Enter a valid UPI ID (name@bank)." };
    if (d.payoutMethod === "bank" && (!d.accountNumber || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifsc))) return { ok: false, error: "Enter account number and a valid IFSC." };

    const existing = await Supplier.findOne({ userId: user.id });
    const payload = {
      companyName: d.companyName,
      industry: d.industry,
      gstin: d.gstin,
      factoryAddress: d.factoryAddress,
      contactPerson: d.contactPerson,
      phone: d.phone,
      documents: d.documents,
      payoutDetails: { method: d.payoutMethod, accountName: d.accountName, accountNumber: d.accountNumber, ifsc: d.ifsc, upiId: d.upiId },
      onboardingComplete: true,
    };
    if (existing) {
      await deleteUploadedFiles(removedKeys(existing.documents, d.documents));
      Object.assign(existing, payload);
      // Editing details after a rejection sends the profile back for review.
      if (existing.verificationStatus === "rejected") existing.verificationStatus = "pending";
      await existing.save();
    } else {
      await Supplier.create({ ...payload, userId: user.id, verificationStatus: "pending" });
    }
    revalidatePath("/supplier");
    return { ok: true, message: "Saved — our team will verify your details shortly." };
  } catch (e) {
    return actionError(e);
  }
}

/** "Submit off-cuts" form → a SupplierSubmission in the "new" column of the admin kanban. */
export async function createSubmission(input: unknown): Promise<ActionResult> {
  try {
    const { user, supplier } = await assertSupplier();
    if (supplier.verificationStatus !== "verified") return { ok: false, error: "Your account must be verified before submitting off-cuts." };
    const d = submissionSchema.parse(input);
    await SupplierSubmission.create({
      ...d,
      categoryId: d.categoryId || null,
      description: cleanText(d.description),
      supplierId: supplier._id,
      status: "new",
      statusHistory: [{ status: "new", note: "Submitted by supplier", at: new Date() }],
    });
    await sendEmail(user.email, "We received your off-cuts submission", createElement(SubmissionReceivedEmail, { company: supplier.companyName, material: d.material, url: siteUrl("/supplier/submissions") }));
    revalidatePath("/supplier/submissions");
    return { ok: true, message: "Submitted — expect an offer within 2 working days." };
  } catch (e) {
    return actionError(e);
  }
}

export async function respondToOffer(submissionId: string, accept: boolean): Promise<ActionResult> {
  try {
    const { supplier } = await assertSupplier();
    const sub = await SupplierSubmission.findOne({ _id: objectId.parse(submissionId), supplierId: supplier._id });
    if (!sub || sub.status !== "offer-sent") return { ok: false, error: "There is no open offer on this submission." };
    sub.supplierResponse = accept ? "accepted" : "declined";
    sub.status = accept ? "accepted" : "rejected";
    sub.statusHistory.push({ status: sub.status, note: accept ? "Supplier accepted the offer" : "Supplier declined the offer", at: new Date() });
    await sub.save();
    revalidatePath("/supplier/submissions");
    return { ok: true, message: accept ? "Offer accepted — we'll schedule pickup." : "Offer declined." };
  } catch (e) {
    return actionError(e);
  }
}
