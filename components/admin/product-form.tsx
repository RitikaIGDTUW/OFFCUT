"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { saveProduct, duplicateProduct } from "@/actions/admin/catalog";
import { CONDITIONS, CONDITION_LABEL, DIM_UNITS, GRADES, PRODUCT_STATUS, UNIT_TYPES } from "@/lib/constants";
import { co2Factor } from "@/lib/co2";
import { discountPct, slugify, type DimUnit } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";
import { LotCard } from "@/components/shop/lot-card";
import { ImageManager, type ManagedImage } from "./image-manager";

type Option = { _id: string; name: string };

/**
 * Create / edit a lot. Left: every field from the model. Right (sticky): live preview of the
 * sample-tag card plus auto-calculated discount and sustainability numbers.
 */
export function ProductForm({
  initial,
  id,
  lotNumber,
  categories,
  suppliers,
  submissionId,
}: {
  initial?: Partial<ProductInput>;
  id?: string;
  lotNumber?: string;
  categories: Option[];
  suppliers: Option[];
  submissionId?: string;
}) {
  const router = useRouter();
  const [images, setImages] = useState<ManagedImage[]>(((initial?.images as ManagedImage[]) ?? []).map((i) => ({ ...i, alt: i.alt ?? "" })));
  const [spec, setSpec] = useState<UploadedFile[]>(initial?.specSheetPdf ? [initial.specSheetPdf as UploadedFile] : []);
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      categoryId: categories[0]?._id ?? "",
      supplierId: "",
      materialType: "",
      grade: "A" as const,
      gradeDetail: "",
      condition: "offcut" as const,
      dimensions: { length: 0, width: 0, thickness: 0, unit: "mm" as const },
      isRoll: false,
      rollLength: 0,
      weightKg: 0,
      quantityAvailable: 1,
      unitType: "piece" as const,
      sellByWeight: false,
      price: 0,
      compareAtRetailPrice: 0,
      costPrice: 0,
      colour: "",
      finish: "",
      origin: "India",
      certifications: "",
      tags: "",
      images: [],
      specSheetPdf: null,
      status: "draft" as const,
      featured: false,
      ...initial,
    },
  });
  const e = form.formState.errors;
  const v = form.watch();

  // Live, auto-calculated numbers
  const price = Number(v.price) || 0;
  const retail = Number(v.compareAtRetailPrice) || 0;
  const pct = discountPct(price, retail);
  const unitKg = v.sellByWeight ? 1 : Number(v.weightKg) || 0;
  const kgLot = unitKg * (Number(v.quantityAvailable) || 0);
  const co2 = kgLot * co2Factor(v.materialType ?? "");
  const margin = Number(v.costPrice) ? Math.round(((price - Number(v.costPrice)) / price) * 100) : null;
  const cat = categories.find((c) => c._id === v.categoryId);

  const submit = form.handleSubmit(async (values) => {
    const r = await saveProduct({ ...values, images, specSheetPdf: spec[0] ? { url: spec[0].url, key: spec[0].key } : null }, id, submissionId);
    if (r.ok && r.data) {
      toast.success(r.message);
      if (!id) router.push(`/admin/products/${r.data.id}`);
      else router.refresh();
    } else if (!r.ok) toast.error(r.error);
  });

  const n = (name: Parameters<typeof form.register>[0]) => form.register(name);

  return (
    <form onSubmit={submit} className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <Section title="Basics">
          <Field label="Title" htmlFor="p-title" error={e.title?.message} className="sm:col-span-2">
            <Input id="p-title" {...n("title")} />
          </Field>
          <Field label="Slug (auto from title if blank)" htmlFor="p-slug" error={e.slug?.message} hint={`/lot/${v.slug || slugify(v.title ?? "") || "…"}`}>
            <Input id="p-slug" {...n("slug")} className="font-mono" />
          </Field>
          <Field label="Lot number" htmlFor="p-lot" hint="Assigned automatically">
            <Input id="p-lot" value={lotNumber ? `#${lotNumber}` : "auto (A-xxxx)"} disabled className="font-mono" />
          </Field>
          <Field label="Category" htmlFor="p-cat" error={e.categoryId?.message}>
            <Select id="p-cat" {...n("categoryId")}>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier" htmlFor="p-sup">
            <Select id="p-sup" {...n("supplierId")}>
              <option value="">— OFFCUT stock —</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description (plain text or simple HTML)" htmlFor="p-desc" className="sm:col-span-2" hint="Blank lines become paragraphs. HTML is sanitised on save.">
            <Textarea id="p-desc" rows={7} {...n("description")} />
          </Field>
        </Section>

        <Section title="Material & grade">
          <Field label="Material type" htmlFor="p-mat" error={e.materialType?.message} hint="Used for filters and CO₂ factor, e.g. Leather, Aluminium">
            <Input id="p-mat" {...n("materialType")} />
          </Field>
          <Field label="Grade" htmlFor="p-grade">
            <Select id="p-grade" {...n("grade")}>
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Grade detail" htmlFor="p-gd" hint='e.g. "6061-T6", "Full-grain Italian"'>
            <Input id="p-gd" {...n("gradeDetail")} />
          </Field>
          <Field label="Condition" htmlFor="p-cond">
            <Select id="p-cond" {...n("condition")}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colour" htmlFor="p-col">
            <Input id="p-col" {...n("colour")} />
          </Field>
          <Field label="Finish" htmlFor="p-fin">
            <Input id="p-fin" {...n("finish")} />
          </Field>
          <Field label="Origin country" htmlFor="p-ori">
            <Input id="p-ori" {...n("origin")} />
          </Field>
          <Field label="Certifications (comma separated)" htmlFor="p-cert">
            <Input id="p-cert" {...n("certifications")} />
          </Field>
          <Field label="Tags (comma separated)" htmlFor="p-tags" className="sm:col-span-2">
            <Input id="p-tags" {...n("tags")} />
          </Field>
        </Section>

        <Section title="Dimensions & weight">
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <Field label="Length" htmlFor="p-l" error={e.dimensions?.length?.message}>
              <Input id="p-l" type="number" step="any" {...n("dimensions.length")} />
            </Field>
            <Field label="Width" htmlFor="p-w" error={e.dimensions?.width?.message}>
              <Input id="p-w" type="number" step="any" {...n("dimensions.width")} />
            </Field>
            <Field label="Thickness" htmlFor="p-t">
              <Input id="p-t" type="number" step="any" {...n("dimensions.thickness")} />
            </Field>
            <Field label="Unit" htmlFor="p-u">
              <Select id="p-u" {...n("dimensions.unit")}>
                {DIM_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox id="p-roll" {...n("isRoll")} label="This lot is a roll" />
          {v.isRoll ? (
            <Field label="Roll length (m)" htmlFor="p-rl">
              <Input id="p-rl" type="number" step="any" {...n("rollLength")} />
            </Field>
          ) : (
            <span />
          )}
          <Field label="Weight per unit (kg)" htmlFor="p-kg">
            <Input id="p-kg" type="number" step="any" {...n("weightKg")} />
          </Field>
        </Section>

        <Section title="Price & stock">
          <Field label="Sold by" htmlFor="p-ut">
            <Select id="p-ut" {...n("unitType")}>
              {UNIT_TYPES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </Select>
          </Field>
          <Checkbox id="p-sbw" {...n("sellByWeight")} label="Sell by weight (price is per kg, stock is in kg)" />
          <Field label={v.sellByWeight ? "Stock (kg)" : "Quantity available"} htmlFor="p-qty" error={e.quantityAvailable?.message}>
            <Input id="p-qty" type="number" step="any" {...n("quantityAvailable")} />
          </Field>
          <Field label={`Price (₹ per ${v.sellByWeight ? "kg" : v.unitType})`} htmlFor="p-price" error={e.price?.message}>
            <Input id="p-price" type="number" step="any" {...n("price")} />
          </Field>
          <Field label="Retail / compare-at price (₹)" htmlFor="p-retail" hint={pct ? `${pct}% below retail` : undefined}>
            <Input id="p-retail" type="number" step="any" {...n("compareAtRetailPrice")} />
          </Field>
          <Field label="Cost price (₹, admin only)" htmlFor="p-cost" hint={margin !== null ? `Margin ${margin}%` : "Never shown to buyers"}>
            <Input id="p-cost" type="number" step="any" {...n("costPrice")} />
          </Field>
        </Section>

        <Section title="Photos & spec sheet">
          <div className="sm:col-span-2">
            <ImageManager value={images} onChange={setImages} />
          </div>
          <Field label="Spec sheet (PDF)" className="sm:col-span-2">
            <Uploader endpoint="specSheet" value={spec} onChange={setSpec} max={1} accept="application/pdf" label="Drop spec-sheet PDF" />
          </Field>
        </Section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-ink p-4">
          <p className="spec mb-3 text-[10px] text-graphite">Live preview</p>
          <LotCard
            preview
            lot={{
              lotNumber: lotNumber ?? "A-NEW",
              title: v.title || "Untitled lot",
              slug: "preview",
              grade: v.grade ?? "A",
              gradeDetail: v.gradeDetail,
              condition: v.condition ?? "offcut",
              dimensions: { length: Number(v.dimensions?.length) || 0, width: Number(v.dimensions?.width) || 0, thickness: Number(v.dimensions?.thickness) || null, unit: (v.dimensions?.unit ?? "mm") as DimUnit },
              isRoll: v.isRoll,
              rollLength: Number(v.rollLength) || null,
              weightKg: Number(v.weightKg) || 0,
              unitType: v.unitType ?? "piece",
              sellByWeight: Boolean(v.sellByWeight),
              price,
              compareAtRetailPrice: retail || null,
              discountPct: pct,
              images,
              quantityAvailable: Number(v.quantityAvailable) || 0,
              status: v.status ?? "draft",
              categoryId: cat ? { name: cat.name, slug: "" } : null,
            }}
          />
        </div>
        <dl className="grid grid-cols-2 gap-px border border-ink bg-ink text-sm">
          <div className="bg-paper p-3">
            <dt className="spec text-[10px] text-graphite">Kg in lot</dt>
            <dd className="font-mono text-lg text-moss">{kgLot.toFixed(1)}</dd>
          </div>
          <div className="bg-paper p-3">
            <dt className="spec text-[10px] text-graphite">CO₂e avoided</dt>
            <dd className="font-mono text-lg text-moss">{co2.toFixed(0)} kg</dd>
          </div>
        </dl>
        <div className="space-y-3 border border-ink p-4">
          <Field label="Status" htmlFor="p-status">
            <Select id="p-status" {...n("status")}>
              {PRODUCT_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Checkbox id="p-feat" {...n("featured")} label="Featured lot" />
          <Button type="submit" variant="signal" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            {id ? "Save changes" : "Create lot"}
          </Button>
          {id ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                const r = await duplicateProduct(id);
                if (r.ok && r.data) router.push(`/admin/products/${r.data.id}`);
                else if (!r.ok) toast.error(r.error);
              }}
            >
              Duplicate lot
            </Button>
          ) : null}
          {Object.keys(e).length ? <p className="text-xs text-oxide">Fix the highlighted fields ({Object.keys(e).join(", ")}).</p> : null}
        </div>
      </aside>
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
