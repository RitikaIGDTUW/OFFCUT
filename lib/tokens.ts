import "server-only";
import crypto from "crypto";
import { createElement } from "react";
import { User } from "@/models/User";
import { sendEmail, siteUrl } from "./email";
import { ResetPasswordEmail } from "@/components/emails/templates";

/**
 * NOTE: these helpers deliberately live outside the `"use server"` action files — every export of
 * an action file becomes a publicly callable endpoint, and sendResetLink must never be one.
 */

/** Random token for links; only its SHA-256 hash is stored, so a DB leak can't be used to log in. */
export function makeToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function sendResetLink(userId: string, email: string, name: string) {
  const { token, hash } = makeToken();
  await User.updateOne({ _id: userId }, { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + 60 * 60_000) });
  await sendEmail(email, "Reset your OFFCUT password", createElement(ResetPasswordEmail, { name, url: siteUrl(`/reset-password/${token}`) }));
}
