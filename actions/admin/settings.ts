"use server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionError, assertAdmin } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { Settings } from "@/models/Settings";
import type { ActionResult } from "@/lib/utils";

const settingsSchema = z.object({
  shipping: z.object({
    mode: z.enum(["flat", "free-above", "per-kg"]),
    flatRate: z.coerce.number().min(0),
    freeAbove: z.coerce.number().min(0),
    perKgRate: z.coerce.number().min(0),
    expressSurcharge: z.coerce.number().min(0),
  }),
  taxRate: z.coerce.number().min(0).max(40),
  codEnabled: z.boolean(),
  hero: z.object({
    eyebrow: z.string().trim().max(80),
    title: z.string().trim().min(5).max(120),
    subtitle: z.string().trim().max(400),
    images: z.array(z.string().url()).max(4),
  }),
  announcement: z.string().trim().max(200),
  landfillOffsetKg: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  showSupplierNames: z.boolean(),
  contact: z.object({ email: z.string().email(), phone: z.string().max(30), address: z.string().max(200) }),
  social: z.object({ instagram: z.string().max(200), linkedin: z.string().max(200), x: z.string().max(200) }),
  seo: z.object({ title: z.string().max(120), description: z.string().max(300) }),
  faq: z.array(z.object({ q: z.string().trim().min(3).max(200), a: z.string().trim().min(3).max(2000) })).max(40),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: unknown): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const d = settingsSchema.parse(input);
    const before = await Settings.findOne({ key: "global" }).lean();
    await Settings.updateOne({ key: "global" }, { $set: d }, { upsert: true });
    await audit(admin, "settings.update", "Settings", "global", before, d);
    revalidateTag("settings");
    revalidateTag("catalog");
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved" };
  } catch (e) {
    return actionError(e);
  }
}
