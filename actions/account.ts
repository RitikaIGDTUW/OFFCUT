"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { actionError, assertRole } from "@/lib/guards";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { deleteUploadedFiles } from "@/lib/utapi";
import { addressSchema, materialRequestSchema, objectId, profileSchema, reviewSchema } from "@/lib/validations/common";
import { changePasswordSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { MaterialRequest, Review } from "@/models/misc";
import type { ActionResult } from "@/lib/utils";

const ANY = ["buyer", "supplier", "admin"] as const;

export async function toggleWishlist(productId: string): Promise<ActionResult<boolean>> {
  try {
    const user = await assertRole([...ANY]);
    const id = objectId.parse(productId);
    const u = await User.findById(user.id).select("wishlist");
    if (!u) throw new Error("User not found");
    const has = u.wishlist.some((w) => w.toString() === id);
    await User.updateOne({ _id: user.id }, has ? { $pull: { wishlist: id } } : { $addToSet: { wishlist: id } });
    revalidatePath("/account/wishlist");
    return { ok: true, data: !has };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const data = profileSchema.parse(input);
    await User.updateOne({ _id: user.id }, { name: data.name, phone: data.phone || undefined, buyerType: data.buyerType, gstin: data.gstin || undefined });
    revalidatePath("/account");
    return { ok: true, message: "Profile saved" };
  } catch (e) {
    return actionError(e);
  }
}

/** Saves a new avatar uploaded via UploadThing and deletes the previous file. */
export async function updateAvatar(file: { url: string; key?: string } | null): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const u = await User.findById(user.id).select("imageKey");
    const oldKey = u?.imageKey;
    await User.updateOne({ _id: user.id }, file ? { image: file.url, imageKey: file.key } : { $unset: { image: 1, imageKey: 1 } });
    if (oldKey && oldKey !== file?.key) await deleteUploadedFiles([oldKey]);
    revalidatePath("/account/profile");
    return { ok: true, message: "Avatar updated" };
  } catch (e) {
    return actionError(e);
  }
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const data = changePasswordSchema.parse(input);
    if (!rateLimit(`pw:${user.id}`, 5, 10 * 60_000)) return { ok: false, error: "Too many attempts." };
    const u = await User.findById(user.id).select("+passwordHash");
    if (u?.passwordHash && !(await bcrypt.compare(data.current, u.passwordHash))) return { ok: false, error: "Current password is wrong." };
    await User.updateOne({ _id: user.id }, { passwordHash: await bcrypt.hash(data.password, 12) });
    return { ok: true, message: "Password changed" };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Addresses ───────── */
export async function saveAddress(input: unknown, addressId?: string): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const data = addressSchema.parse(input);
    const u = await User.findById(user.id);
    if (!u) throw new Error("User not found");
    if (data.isDefault || u.addresses.length === 0) {
      u.addresses.forEach((a) => (a.isDefault = false));
      data.isDefault = true;
    }
    if (addressId) {
      const a = u.addresses.find((x) => x._id.toString() === addressId);
      if (!a) throw new Error("Address not found");
      Object.assign(a, data);
    } else {
      if (u.addresses.length >= 10) return { ok: false, error: "Maximum 10 addresses." };
      u.addresses.push({ ...data, _id: new Types.ObjectId() });
    }
    await u.save();
    revalidatePath("/account/addresses");
    return { ok: true, message: "Address saved" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    await User.updateOne({ _id: user.id }, { $pull: { addresses: { _id: objectId.parse(addressId) } } });
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Reviews ───────── */
export async function submitReview(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    if (!rateLimit(`review:${user.id}:${await clientIp()}`, 5, 60 * 60_000)) return { ok: false, error: "Too many reviews — try later." };
    const data = reviewSchema.parse(input);
    const purchased = await Order.exists({ userId: user.id, "items.productId": data.productId, orderStatus: { $nin: ["cancelled"] } });
    if (data.photos.length && !purchased) return { ok: false, error: "Only verified buyers can add review photos." };
    await Review.create({
      ...data,
      title: cleanText(data.title),
      body: cleanText(data.body),
      userId: user.id,
      userName: user.name,
      verifiedPurchase: Boolean(purchased),
      isApproved: false, // moderated by admin
    });
    return { ok: true, message: "Thanks! Your review will appear after moderation." };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Material Wanted ───────── */
export async function createMaterialRequest(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const data = materialRequestSchema.parse(input);
    await dbConnect();
    const open = await MaterialRequest.countDocuments({ userId: user.id, status: "open" });
    if (open >= 10) return { ok: false, error: "You have 10 open requests — close some first." };
    await MaterialRequest.create({ ...data, notes: data.notes ? cleanText(data.notes) : undefined, userId: user.id });
    revalidatePath("/account/requests");
    return { ok: true, message: "Request posted — we'll email you when we find a match." };
  } catch (e) {
    return actionError(e);
  }
}

export async function closeMaterialRequest(id: string): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    await MaterialRequest.updateOne({ _id: objectId.parse(id), userId: user.id }, { status: "closed" });
    revalidatePath("/account/requests");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Order cancel / return requests ───────── */
export async function requestCancelOrReturn(orderNumber: string, kind: "cancel" | "return", reason: string): Promise<ActionResult> {
  try {
    const user = await assertRole([...ANY]);
    const clean = cleanText(reason).slice(0, 500);
    if (clean.length < 5) return { ok: false, error: "Please give a short reason." };
    const order = await Order.findOne({ orderNumber, userId: user.id });
    if (!order) return { ok: false, error: "Order not found." };
    if (kind === "cancel") {
      if (!["placed", "confirmed"].includes(order.orderStatus)) return { ok: false, error: "This order can no longer be cancelled." };
      order.cancelRequest = { reason: clean, at: new Date(), resolved: false };
    } else {
      if (order.orderStatus !== "delivered") return { ok: false, error: "Returns are possible after delivery." };
      const days = (Date.now() - order.updatedAt.getTime()) / 86_400_000;
      if (days > 7) return { ok: false, error: "The 7-day return window has passed." };
      order.returnRequest = { reason: clean, at: new Date(), resolved: false };
    }
    order.statusHistory.push({ status: `${kind}-requested`, note: clean, at: new Date(), by: user.email });
    await order.save();
    revalidatePath(`/account/orders/${orderNumber}`);
    return { ok: true, message: kind === "cancel" ? "Cancellation requested" : "Return requested" };
  } catch (e) {
    return actionError(e);
  }
}
