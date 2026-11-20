import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { env, features } from "./env";

/**
 * Email delivery with three tiers, so the app works fully offline:
 *  1. SMTP_* env vars set  → real email (Gmail app password, Mailtrap, …)
 *  2. otherwise, online    → Ethereal test inbox; a preview URL is printed to the terminal
 *  3. offline              → full email logged to the console
 * Sending never throws: a failed email must not break checkout or signup.
 */
type Mode = "smtp" | "ethereal" | "console";
const g = globalThis as unknown as { _mailer?: Promise<{ t: Transporter; mode: Mode }> };

async function createTransport(): Promise<{ t: Transporter; mode: Mode }> {
  if (features.smtp) {
    return {
      mode: "smtp",
      t: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }),
    };
  }
  try {
    const account = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]);
    return {
      mode: "ethereal",
      t: nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      }),
    };
  } catch {
    return { mode: "console", t: nodemailer.createTransport({ jsonTransport: true }) };
  }
}

function mailer() {
  g._mailer ??= createTransport();
  return g._mailer;
}

export async function sendEmail(to: string, subject: string, element: ReactElement) {
  try {
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const { t, mode } = await mailer();
    const info = await t.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    if (mode === "ethereal") {
      console.log(`\n📧 [email:ethereal] "${subject}" → ${to}\n   Preview: ${nodemailer.getTestMessageUrl(info)}\n`);
    } else if (mode === "console") {
      console.log(`\n📧 [email:console] "${subject}" → ${to}\n${text.slice(0, 1200)}\n`);
    }
    return true;
  } catch (e) {
    console.error(`[email] failed to send "${subject}" to ${to}`, e);
    return false;
  }
}

export const siteUrl = (path = "/") => new URL(path, env.SITE_URL).toString();
