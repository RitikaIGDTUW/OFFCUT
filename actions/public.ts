"use server";
import { createElement } from "react";
import { dbConnect } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { contactSchema, newsletterSchema } from "@/lib/validations/common";
import { ContactMessage, NewsletterSubscriber } from "@/models/misc";
import { sendEmail } from "@/lib/email";
import { ContactEmail } from "@/components/emails/templates";
import { getSettings } from "@/lib/settings";
import { cleanText } from "@/lib/sanitize";
import type { ActionResult } from "@/lib/utils";

export async function subscribeNewsletter(input: { email: string }): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  if (!rateLimit(`nl:${await clientIp()}`, 5, 60_000)) return { ok: false, error: "Too many attempts, try again in a minute." };
  await dbConnect();
  await NewsletterSubscriber.updateOne({ email: parsed.data.email }, { $setOnInsert: { email: parsed.data.email } }, { upsert: true });
  return { ok: true, message: "You're on the Friday drop list." };
}

/** Contact form → saved to MongoDB and emailed to the store contact address. */
export async function submitContact(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!rateLimit(`contact:${await clientIp()}`, 3, 10 * 60_000)) return { ok: false, error: "Too many messages — please wait a few minutes." };
  await dbConnect();
  const data = { ...parsed.data, message: cleanText(parsed.data.message), subject: cleanText(parsed.data.subject) };
  await ContactMessage.create(data);
  const settings = await getSettings();
  await sendEmail(settings.contact.email, `Contact: ${data.subject}`, createElement(ContactEmail, data));
  return { ok: true, message: "Thanks — we'll reply within one working day." };
}
