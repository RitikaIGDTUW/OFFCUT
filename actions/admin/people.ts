"use server";
import { createElement } from "react";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionError, assertAdmin } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { sendEmail, siteUrl } from "@/lib/email";
import { sendResetLink } from "@/lib/tokens";
import { objectId } from "@/lib/validations/common";
import { ROLES, SUBMISSION_STATUS, type Role, type SubmissionStatus } from "@/lib/constants";
import type { ActionResult } from "@/lib/utils";
import { User } from "@/models/User";
import { Supplier } from "@/models/Supplier";
import { Payout, SupplierSubmission } from "@/models/misc";
import { OfferSentEmail, SupplierVerifiedEmail } from "@/components/emails/templates";

/* ───────── Users ───────── */
export async function setUserRole(id: string, role: Role): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (!ROLES.includes(role)) return { ok: false, error: "Unknown role." };
    if (id === admin.id && role !== "admin") return { ok: false, error: "You can't remove your own admin role." };
    const before = await User.findByIdAndUpdate(objectId.parse(id), { role }).select("role").lean();
    await audit(admin, "user.role", "User", id, { role: before?.role }, { role });
    revalidatePath("/admin/users");
    return { ok: true, message: `Role changed to ${role}. They'll see it on their next sign-in.` };
  } catch (e) {
    return actionError(e);
  }
}

export async function setUserBlocked(id: string, blocked: boolean): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (id === admin.id) return { ok: false, error: "You can't block yourself." };
    await User.updateOne({ _id: objectId.parse(id) }, { isBlocked: blocked });
    await audit(admin, blocked ? "user.block" : "user.unblock", "User", id);
    revalidatePath("/admin/users");
    return { ok: true, message: blocked ? "User blocked" : "User unblocked" };
  } catch (e) {
    return actionError(e);
  }
}

export async function adminSendPasswordReset(id: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const u = await User.findById(objectId.parse(id)).select("name email").lean();
    if (!u) return { ok: false, error: "User not found." };
    await sendResetLink(u._id.toString(), u.email, u.name);
    await audit(admin, "user.reset-password", "User", id);
    return { ok: true, message: `Reset link emailed to ${u.email}` };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Suppliers ───────── */
export async function verifySupplier(id: string, approve: boolean, reason = ""): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (!approve && reason.trim().length < 5) return { ok: false, error: "Give a reason for the rejection." };
    const s = await Supplier.findByIdAndUpdate(
      objectId.parse(id),
      { verificationStatus: approve ? "verified" : "rejected", rejectionReason: approve ? undefined : reason.trim() },
      { new: true },
    ).lean();
    if (!s) return { ok: false, error: "Supplier not found." };
    const u = await User.findById(s.userId).select("email").lean();
    if (u) {
      await sendEmail(
        u.email,
        approve ? "Your OFFCUT supplier account is verified" : "Supplier verification update",
        createElement(SupplierVerifiedEmail, { company: s.companyName, verified: approve, reason: reason.trim(), url: siteUrl("/supplier") }),
      );
    }
    await audit(admin, approve ? "supplier.verify" : "supplier.reject", "Supplier", id, undefined, { reason });
    revalidatePath("/admin/suppliers");
    return { ok: true, message: approve ? "Supplier verified" : "Supplier rejected" };
  } catch (e) {
    return actionError(e);
  }
}

export async function setCommission(id: string, rate: number): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const r = z.coerce.number().min(0).max(60).parse(rate);
    await Supplier.updateOne({ _id: objectId.parse(id) }, { commissionRate: r });
    await audit(admin, "supplier.commission", "Supplier", id, undefined, { rate: r });
    revalidatePath("/admin/suppliers");
    return { ok: true, message: `Commission set to ${r}%` };
  } catch (e) {
    return actionError(e);
  }
}

export async function markPayoutPaid(id: string, reference: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (reference.trim().length < 3) return { ok: false, error: "Enter the bank / UPI reference." };
    await Payout.updateOne({ _id: objectId.parse(id), status: "pending" }, { status: "paid", reference: reference.trim(), paidAt: new Date() });
    await audit(admin, "payout.paid", "Payout", id, undefined, { reference });
    revalidatePath("/admin/suppliers");
    return { ok: true, message: "Payout marked paid" };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Supplier submissions (kanban) ───────── */
export async function moveSubmission(id: string, status: SubmissionStatus, note = ""): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (!SUBMISSION_STATUS.includes(status)) return { ok: false, error: "Unknown status." };
    const sub = await SupplierSubmission.findById(objectId.parse(id));
    if (!sub) return { ok: false, error: "Submission not found." };
    if (status === "offer-sent" && !sub.adminOffer) return { ok: false, error: "Use “Send offer” to move a card to Offer sent." };
    const before = sub.status;
    sub.status = status;
    sub.statusHistory.push({ status, note: note || `Moved by ${admin.email}`, at: new Date() });
    await sub.save();
    await audit(admin, "submission.move", "SupplierSubmission", id, { status: before }, { status });
    revalidatePath("/admin/submissions");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function sendOffer(id: string, amount: number, message: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const amt = z.coerce.number().positive().parse(amount);
    const sub = await SupplierSubmission.findById(objectId.parse(id));
    if (!sub) return { ok: false, error: "Submission not found." };
    sub.adminOffer = { amount: amt, message: message.trim() || undefined, at: new Date() };
    sub.status = "offer-sent";
    sub.supplierResponse = null;
    sub.statusHistory.push({ status: "offer-sent", note: `Offer ₹${amt}`, at: new Date() });
    await sub.save();
    const supplier = await Supplier.findById(sub.supplierId).lean();
    const u = supplier ? await User.findById(supplier.userId).select("email").lean() : null;
    if (u && supplier) {
      await sendEmail(u.email, "You have an offer from OFFCUT", createElement(OfferSentEmail, { company: supplier.companyName, material: sub.material, amount: amt, message: message.trim(), url: siteUrl("/supplier/submissions") }));
    }
    await audit(admin, "submission.offer", "SupplierSubmission", id, undefined, { amount: amt });
    revalidatePath("/admin/submissions");
    return { ok: true, message: "Offer sent to supplier" };
  } catch (e) {
    return actionError(e);
  }
}

export async function saveSubmissionNotes(id: string, notes: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    await SupplierSubmission.updateOne({ _id: objectId.parse(id) }, { notes: notes.slice(0, 2000) });
    return { ok: true, message: "Notes saved" };
  } catch (e) {
    return actionError(e);
  }
}
