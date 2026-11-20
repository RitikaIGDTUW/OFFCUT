"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { onboardingSchema, submissionSchema, type OnboardingInput } from "@/lib/validations/supplier";
import { createSubmission, respondToOffer, saveOnboarding } from "@/actions/supplier";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";
import { cn } from "@/lib/utils";

const WIZARD = ["Company", "Documents", "Payouts"] as const;

/** 3-step onboarding wizard. All steps share one form; each step validates its own fields. */
export function OnboardingWizard({ initial }: { initial: Partial<OnboardingInput> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [docs, setDocs] = useState<UploadedFile[]>((initial.documents as UploadedFile[]) ?? []);
  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      gstin: "",
      factoryAddress: "",
      contactPerson: "",
      phone: "",
      documents: [],
      payoutMethod: "upi" as const,
      accountName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
      ...initial,
    },
  });
  const e = form.formState.errors;
  const method = form.watch("payoutMethod");
  const stepFields: (keyof OnboardingInput)[][] = [["companyName", "industry", "gstin", "factoryAddress", "contactPerson", "phone"], [], ["payoutMethod"]];

  const next = async () => {
    if (await form.trigger(stepFields[step])) setStep((s) => s + 1);
  };

  return (
    <form
      className="max-w-3xl"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await saveOnboarding({ ...v, documents: docs });
        if (r.ok) {
          toast.success(r.message);
          router.push("/supplier");
          router.refresh();
        } else toast.error(r.error);
      })}
    >
      <ol className="mb-8 grid grid-cols-3 border border-ink">
        {WIZARD.map((s, i) => (
          <li key={s} className={cn("spec px-3 py-2 text-[10px]", i > 0 && "border-l border-ink", i === step && "bg-ink text-paper")}>
            0{i + 1} {s}
          </li>
        ))}
      </ol>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")}>
        <Field label="Company name" htmlFor="o-co" error={e.companyName?.message}>
          <Input id="o-co" {...form.register("companyName")} />
        </Field>
        <Field label="Industry" htmlFor="o-ind" error={e.industry?.message} hint="e.g. Tannery, Textile mill, CNC machining">
          <Input id="o-ind" {...form.register("industry")} />
        </Field>
        <Field label="GSTIN" htmlFor="o-gst" error={e.gstin?.message}>
          <Input id="o-gst" className="font-mono uppercase" {...form.register("gstin")} />
        </Field>
        <Field label="Contact person" htmlFor="o-cp" error={e.contactPerson?.message}>
          <Input id="o-cp" {...form.register("contactPerson")} />
        </Field>
        <Field label="Phone" htmlFor="o-ph" error={e.phone?.message}>
          <Input id="o-ph" {...form.register("phone")} />
        </Field>
        <Field label="Factory address" htmlFor="o-addr" error={e.factoryAddress?.message} className="sm:col-span-2">
          <Textarea id="o-addr" {...form.register("factoryAddress")} />
        </Field>
      </div>

      <div className={cn(step !== 1 && "hidden")}>
        <p className="mb-4 text-sm text-graphite">Upload your GST certificate and a factory registration / trade licence (PDF or image).</p>
        <Uploader endpoint="supplierDocs" value={docs} onChange={setDocs} max={5} accept="application/pdf,image/*" label="Drop GST certificate, trade licence…" />
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", step !== 2 && "hidden")}>
        <fieldset className="sm:col-span-2">
          <legend className="spec mb-2 text-[11px] text-graphite">Payout method</legend>
          <div className="flex gap-2">
            {(["upi", "bank"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 border border-ink px-3 py-2 text-sm has-[:checked]:bg-paper-2">
                <input type="radio" value={m} {...form.register("payoutMethod")} className="accent-[#183D35]" /> {m === "upi" ? "UPI" : "Bank transfer"}
              </label>
            ))}
          </div>
        </fieldset>
        {method === "upi" ? (
          <Field label="UPI ID" htmlFor="o-upi" className="sm:col-span-2">
            <Input id="o-upi" placeholder="factory@okhdfc" {...form.register("upiId")} />
          </Field>
        ) : (
          <>
            <Field label="Account holder" htmlFor="o-an">
              <Input id="o-an" {...form.register("accountName")} />
            </Field>
            <Field label="Account number" htmlFor="o-acc">
              <Input id="o-acc" className="font-mono" {...form.register("accountNumber")} />
            </Field>
            <Field label="IFSC" htmlFor="o-ifsc">
              <Input id="o-ifsc" className="font-mono uppercase" {...form.register("ifsc")} />
            </Field>
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            ← Back
          </Button>
        ) : null}
        {step < 2 ? (
          <Button type="button" onClick={next}>
            Continue →
          </Button>
        ) : (
          <Button type="submit" variant="signal" loading={form.formState.isSubmitting}>
            Submit for verification
          </Button>
        )}
      </div>
    </form>
  );
}

export function SubmissionForm({ categories, defaultPickup }: { categories: { _id: string; name: string }[]; defaultPickup: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const form = useForm({
    resolver: zodResolver(submissionSchema),
    defaultValues: { material: "", categoryId: "", description: "", approxQuantity: "", approxDimensions: "", approxWeightKg: 0, photos: [], askingPrice: 0, pickupAddress: defaultPickup },
  });
  const e = form.formState.errors;
  return (
    <form
      className="grid max-w-3xl gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await createSubmission({ ...v, photos });
        if (r.ok) {
          toast.success(r.message);
          router.push("/supplier/submissions");
        } else toast.error(r.error);
      })}
    >
      <Field label="Photos (drag & drop, up to 10)" className="sm:col-span-2" error={photos.length ? undefined : e.photos?.message}>
        <Uploader
          endpoint="supplierPhotos"
          value={photos}
          onChange={(p) => {
            setPhotos(p);
            form.setValue("photos", p, { shouldValidate: form.formState.isSubmitted });
          }}
          max={10}
        />
      </Field>
      <Field label="Material" htmlFor="s-mat" error={e.material?.message}>
        <Input id="s-mat" placeholder="Full-grain veg-tan leather strips" {...form.register("material")} />
      </Field>
      <Field label="Category" htmlFor="s-cat">
        <Select id="s-cat" {...form.register("categoryId")}>
          <option value="">— Choose —</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Approx. quantity" htmlFor="s-qty" error={e.approxQuantity?.message}>
        <Input id="s-qty" placeholder="~120 strips / 40 kg" {...form.register("approxQuantity")} />
      </Field>
      <Field label="Approx. dimensions" htmlFor="s-dim" error={e.approxDimensions?.message}>
        <Input id="s-dim" placeholder="500–700 × 100–160 mm, 1.2–1.6 mm thick" {...form.register("approxDimensions")} />
      </Field>
      <Field label="Approx. total weight (kg)" htmlFor="s-kg">
        <Input id="s-kg" type="number" step="0.1" min={0} {...form.register("approxWeightKg")} />
      </Field>
      <Field label="Asking price (₹, optional)" htmlFor="s-ask">
        <Input id="s-ask" type="number" min={0} {...form.register("askingPrice")} />
      </Field>
      <Field label="Description (grade, condition, origin)" htmlFor="s-desc" error={e.description?.message} className="sm:col-span-2">
        <Textarea id="s-desc" rows={5} {...form.register("description")} />
      </Field>
      <Field label="Pickup address" htmlFor="s-pick" error={e.pickupAddress?.message} className="sm:col-span-2">
        <Textarea id="s-pick" {...form.register("pickupAddress")} />
      </Field>
      <Button type="submit" variant="signal" loading={form.formState.isSubmitting} className="sm:col-span-2 sm:justify-self-start">
        Submit off-cuts
      </Button>
    </form>
  );
}

export function OfferResponse({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const respond = (accept: boolean) =>
    start(async () => {
      const r = await respondToOffer(id, accept);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="signal" loading={pending} onClick={() => respond(true)}>
        Accept offer
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(false)}>
        Decline
      </Button>
    </div>
  );
}
