"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveSettings, type SettingsInput } from "@/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const [heroImgs, setHeroImgs] = useState<UploadedFile[]>((initial.hero.images ?? []).map((url) => ({ url })));
  const form = useForm<SettingsInput>({ defaultValues: initial });
  const faq = useFieldArray({ control: form.control, name: "faq" });
  const mode = form.watch("shipping.mode");
  const r = form.register;

  return (
    <form
      className="max-w-4xl space-y-8"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveSettings({ ...v, hero: { ...v.hero, images: heroImgs.map((i) => i.url) } });
        if (res.ok) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.error);
      })}
    >
      <Section title="Homepage hero">
        <Field label="Eyebrow" htmlFor="s-eye">
          <Input id="s-eye" {...r("hero.eyebrow")} />
        </Field>
        <Field label="Title (a “. ” splits it into two lines)" htmlFor="s-title">
          <Input id="s-title" {...r("hero.title")} />
        </Field>
        <Field label="Subtitle" htmlFor="s-sub" className="sm:col-span-2">
          <Textarea id="s-sub" {...r("hero.subtitle")} />
        </Field>
        <Field label="Hero collage images (up to 4; empty = default photos)" className="sm:col-span-2">
          <Uploader endpoint="productImages" value={heroImgs} onChange={setHeroImgs} max={4} />
        </Field>
      </Section>

      <Section title="Announcement & impact">
        <Field label="Announcement bar text" htmlFor="s-ann" className="sm:col-span-2">
          <Input id="s-ann" {...r("announcement")} />
        </Field>
        <Field label="Landfill counter starting offset (kg)" htmlFor="s-off" hint="Material diverted before the platform launched">
          <Input id="s-off" type="number" {...r("landfillOffsetKg")} />
        </Field>
        <Field label="Low-stock threshold" htmlFor="s-low">
          <Input id="s-low" type="number" {...r("lowStockThreshold")} />
        </Field>
        <Checkbox id="s-sup" {...r("showSupplierNames")} label="Show supplier company names on lot pages (otherwise anonymised)" className="sm:col-span-2" />
      </Section>

      <Section title="Shipping, tax & payments">
        <Field label="Shipping rule" htmlFor="s-mode">
          <Select id="s-mode" {...r("shipping.mode")}>
            <option value="free-above">Free above a threshold</option>
            <option value="flat">Flat rate</option>
            <option value="per-kg">Per kg</option>
          </Select>
        </Field>
        <Field label={mode === "per-kg" ? "Minimum charge (₹)" : "Flat rate (₹)"} htmlFor="s-flat">
          <Input id="s-flat" type="number" {...r("shipping.flatRate")} />
        </Field>
        {mode === "free-above" ? (
          <Field label="Free above (₹)" htmlFor="s-free">
            <Input id="s-free" type="number" {...r("shipping.freeAbove")} />
          </Field>
        ) : null}
        {mode === "per-kg" ? (
          <Field label="Rate per kg (₹)" htmlFor="s-kg">
            <Input id="s-kg" type="number" {...r("shipping.perKgRate")} />
          </Field>
        ) : null}
        <Field label="Express surcharge (₹)" htmlFor="s-exp">
          <Input id="s-exp" type="number" {...r("shipping.expressSurcharge")} />
        </Field>
        <Field label="GST rate (%)" htmlFor="s-tax">
          <Input id="s-tax" type="number" step="0.5" {...r("taxRate")} />
        </Field>
        <Checkbox id="s-cod" {...r("codEnabled")} label="Cash on Delivery enabled" />
      </Section>

      <Section title="Contact, social & SEO">
        <Field label="Contact email" htmlFor="s-ce">
          <Input id="s-ce" {...r("contact.email")} />
        </Field>
        <Field label="Phone" htmlFor="s-cp">
          <Input id="s-cp" {...r("contact.phone")} />
        </Field>
        <Field label="Address" htmlFor="s-ca" className="sm:col-span-2">
          <Input id="s-ca" {...r("contact.address")} />
        </Field>
        <Field label="Instagram URL" htmlFor="s-ig">
          <Input id="s-ig" {...r("social.instagram")} />
        </Field>
        <Field label="LinkedIn URL" htmlFor="s-li">
          <Input id="s-li" {...r("social.linkedin")} />
        </Field>
        <Field label="X URL" htmlFor="s-x">
          <Input id="s-x" {...r("social.x")} />
        </Field>
        <span />
        <Field label="Default SEO title" htmlFor="s-st" className="sm:col-span-2">
          <Input id="s-st" {...r("seo.title")} />
        </Field>
        <Field label="Default SEO description" htmlFor="s-sd" className="sm:col-span-2">
          <Textarea id="s-sd" {...r("seo.description")} />
        </Field>
      </Section>

      <fieldset className="border border-ink p-5">
        <legend className="spec px-2 text-[11px]">FAQ items</legend>
        <ol className="space-y-4">
          {faq.fields.map((f, i) => (
            <li key={f.id} className="grid gap-2 border-b border-rule pb-4">
              <Input {...r(`faq.${i}.q` as const)} placeholder="Question" aria-label={`Question ${i + 1}`} />
              <Textarea {...r(`faq.${i}.a` as const)} placeholder="Answer" aria-label={`Answer ${i + 1}`} rows={2} />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => i > 0 && faq.move(i, i - 1)}>
                  ↑
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => i < faq.fields.length - 1 && faq.move(i, i + 1)}>
                  ↓
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => faq.remove(i)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="outline" className="mt-4" onClick={() => faq.append({ q: "", a: "" })}>
          + Add FAQ item
        </Button>
      </fieldset>

      <Button type="submit" variant="signal" size="lg" loading={form.formState.isSubmitting}>
        Save settings
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-ink p-5">
      <legend className="spec px-2 text-[11px]">{title}</legend>
      <div className="grid items-start gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
