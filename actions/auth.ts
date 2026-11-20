"use server";
import bcrypt from "bcryptjs";
import { createElement } from "react";
import { dbConnect } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { forgotSchema, registerSchema, resetSchema } from "@/lib/validations/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { getSessionUser } from "@/lib/guards";
import { User } from "@/models/User";
import { VerifyEmail, WelcomeEmail } from "@/components/emails/templates";
import { hashToken, makeToken, sendResetLink } from "@/lib/tokens";
import type { ActionResult } from "@/lib/utils";

export async function registerUser(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!rateLimit(`register:${await clientIp()}`, 5, 10 * 60_000)) return { ok: false, error: "Too many sign-ups from this network. Try again later." };
  const { name, email, password, buyerType, accountType } = parsed.data;

  await dbConnect();
  if (await User.exists({ email })) return { ok: false, error: "An account with this email already exists.", fieldErrors: { email: ["Already registered"] } };

  const { token, hash } = makeToken();
  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    buyerType,
    role: accountType === "supplier" ? "supplier" : "buyer",
    verifyTokenHash: hash,
  });

  await sendEmail(email, "Verify your OFFCUT email", createElement(VerifyEmail, { name, url: siteUrl(`/verify-email/${token}`) }));
  await sendEmail(email, "Welcome to OFFCUT", createElement(WelcomeEmail, { name, url: siteUrl("/shop") }));
  return { ok: true, message: "Account created" };
}

export async function verifyEmailToken(token: string): Promise<ActionResult> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, error: "Invalid link." };
  await dbConnect();
  const res = await User.updateOne({ verifyTokenHash: hashToken(token) }, { emailVerified: new Date(), $unset: { verifyTokenHash: 1 } });
  return res.modifiedCount ? { ok: true } : { ok: false, error: "This link is invalid or was already used." };
}

export async function resendVerification(): Promise<ActionResult> {
  const s = await getSessionUser();
  if (!s) return { ok: false, error: "Sign in first." };
  if (!rateLimit(`verify:${s.id}`, 3, 60 * 60_000)) return { ok: false, error: "Please wait before requesting another email." };
  await dbConnect();
  const { token, hash } = makeToken();
  await User.updateOne({ _id: s.id }, { verifyTokenHash: hash });
  await sendEmail(s.email, "Verify your OFFCUT email", createElement(VerifyEmail, { name: s.name, url: siteUrl(`/verify-email/${token}`) }));
  return { ok: true, message: "Verification email sent." };
}

/** Always answers the same way so it can't be used to discover which emails have accounts. */
export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  if (!rateLimit(`forgot:${await clientIp()}`, 5, 15 * 60_000)) return { ok: false, error: "Too many requests. Try again later." };
  await dbConnect();
  const user = await User.findOne({ email: parsed.data.email });
  if (user && !user.isBlocked) await sendResetLink(user._id.toString(), user.email, user.name);
  return { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  await dbConnect();
  const user = await User.findOne({ resetTokenHash: hashToken(parsed.data.token), resetTokenExpires: { $gt: new Date() } });
  if (!user) return { ok: false, error: "This reset link is invalid or has expired." };
  user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  return { ok: true, message: "Password updated — you can sign in now." };
}
