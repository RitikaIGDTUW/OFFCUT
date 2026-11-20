"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addressSchema, materialRequestSchema, profileSchema, type AddressInput } from "@/lib/validations/common";
import { changePasswordSchema } from "@/lib/validations/auth";
import { changePassword, closeMaterialRequest, createMaterialRequest, deleteAddress, saveAddress, updateAvatar, updateProfile } from "@/actions/account";
import { BUYER_TYPES, BUYER_TYPE_LABEL, type BuyerType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Uploader, type UploadedFile } from "@/components/ui/uploader";
import { SafeImage } from "@/components/ui/safe-image";

/* ───────── Addresses ───────── */
type Addr = AddressInput & { _id: string };

export function AddressForm({ initial, id, onDone }: { initial?: Addr; id?: string; onDone: () => void }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ?? { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", isDefault: false },
  });
  const e = form.formState.errors;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await saveAddress(v, id);
        if (r.ok) {
          toast.success(r.message);
          onDone();
          router.refresh();
        } else toast.error(r.error);
      })}
    >
      <Field label="Label" htmlFor="ad-label">
        <Input id="ad-label" {...form.register("label")} />
      </Field>
      <Field label="Full name" htmlFor="ad-name" error={e.fullName?.message}>
        <Input id="ad-name" {...form.register("fullName")} />
      </Field>
      <Field label="Phone" htmlFor="ad-phone" error={e.phone?.message}>
        <Input id="ad-phone" {...form.register("phone")} />
      </Field>
      <Field label="PIN code" htmlFor="ad-pin" error={e.pincode?.message}>
        <Input id="ad-pin" inputMode="numeric" {...form.register("pincode")} />
      </Field>
      <Field label="Line 1" htmlFor="ad-l1" error={e.line1?.message} className="sm:col-span-2">
        <Input id="ad-l1" {...form.register("line1")} />
      </Field>
      <Field label="Line 2" htmlFor="ad-l2" className="sm:col-span-2">
        <Input id="ad-l2" {...form.register("line2")} />
      </Field>
      <Field label="City" htmlFor="ad-city" error={e.city?.message}>
        <Input id="ad-city" {...form.register("city")} />
      </Field>
      <Field label="State" htmlFor="ad-state" error={e.state?.message}>
        <Input id="ad-state" {...form.register("state")} />
      </Field>
      <Checkbox id="ad-def" {...form.register("isDefault")} label="Make default" className="sm:col-span-2" />
      <Button type="submit" loading={form.formState.isSubmitting} className="sm:col-span-2">
        Save address
      </Button>
    </form>
  );
}

export function AddressCard({ a }: { a: Addr }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="border border-ink p-4 text-sm">
      <p className="spec mb-2 text-[10px] text-graphite">
        {a.label} {a.isDefault ? "· default" : ""}
      </p>
      <p className="font-medium">{a.fullName}</p>
      <p>
        {a.line1}
        {a.line2 ? `, ${a.line2}` : ""}
      </p>
      <p>
        {a.city}, {a.state} {a.pincode}
      </p>
      <p className="text-graphite">{a.phone}</p>
      <div className="mt-3 flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent title="Edit address">
            <AddressForm initial={a} id={a._id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          onClick={() =>
            start(async () => {
              await deleteAddress(a._id);
              router.refresh();
            })
          }
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export function NewAddressButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="signal">+ Add address</Button>
      </DialogTrigger>
      <DialogContent title="New address">
        <AddressForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Material Wanted ───────── */
export function MaterialRequestForm({ defaultMaterial }: { defaultMaterial?: string }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(materialRequestSchema),
    defaultValues: { material: defaultMaterial ?? "", dimensionsNeeded: "", quantity: "", budget: 0, notes: "" },
  });
  const e = form.formState.errors;
  return (
    <form
      className="grid gap-4 border border-ink p-5 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await createMaterialRequest(v);
        if (r.ok) {
          toast.success(r.message);
          form.reset();
          router.refresh();
        } else toast.error(r.error);
      })}
    >
      <Field label="Material wanted" htmlFor="mr-mat" error={e.material?.message} className="sm:col-span-2">
        <Input id="mr-mat" placeholder="e.g. 3 mm 5052 aluminium sheet" {...form.register("material")} />
      </Field>
      <Field label="Dimensions needed" htmlFor="mr-dim">
        <Input id="mr-dim" placeholder="min 400 × 300 mm" {...form.register("dimensionsNeeded")} />
      </Field>
      <Field label="Quantity" htmlFor="mr-qty">
        <Input id="mr-qty" placeholder="4 pieces" {...form.register("quantity")} />
      </Field>
      <Field label="Budget (₹, optional)" htmlFor="mr-budget" error={e.budget?.message}>
        <Input id="mr-budget" type="number" min={0} {...form.register("budget")} />
      </Field>
      <Field label="Notes" htmlFor="mr-notes" className="sm:col-span-2">
        <Textarea id="mr-notes" {...form.register("notes")} />
      </Field>
      <Button type="submit" variant="signal" loading={form.formState.isSubmitting} className="sm:col-span-2">
        Post request
      </Button>
    </form>
  );
}

export function CloseRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        start(async () => {
          await closeMaterialRequest(id);
          router.refresh();
        })
      }
    >
      Close
    </Button>
  );
}

/* ───────── Profile ───────── */
export function ProfileForm({ initial }: { initial: { name: string; phone?: string; buyerType?: BuyerType; gstin?: string; image?: string; imageKey?: string } }) {
  const router = useRouter();
  const { update } = useSession();
  const [avatar, setAvatar] = useState<UploadedFile[]>(initial.image ? [{ url: initial.image, key: initial.imageKey }] : []);
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initial.name, phone: initial.phone ?? "", buyerType: initial.buyerType ?? "maker", gstin: initial.gstin ?? "" },
  });
  const e = form.formState.errors;
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <div>
        <p className="spec mb-2 text-[10px] text-graphite">Avatar</p>
        <div className="relative mb-3 aspect-square w-full border border-ink bg-paper-2">
          {avatar[0] ? <SafeImage src={avatar[0].url} alt="Your avatar" fill sizes="200px" className="object-cover" /> : <span className="grid h-full place-items-center font-display text-6xl">{initial.name[0]}</span>}
        </div>
        <Uploader
          endpoint="avatar"
          value={[]}
          max={1}
          showPreview={false}
          label="Upload new avatar"
          onChange={async (files) => {
            const f = files[0];
            if (!f) return;
            const r = await updateAvatar(f);
            if (r.ok) {
              setAvatar([f]);
              await update();
              router.refresh();
            } else toast.error(r.error);
          }}
        />
      </div>
      <form
        className="grid h-fit gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(async (v) => {
          const r = await updateProfile(v);
          if (r.ok) {
            toast.success(r.message);
            await update();
            router.refresh();
          } else toast.error(r.error);
        })}
      >
        <Field label="Name" htmlFor="p-name" error={e.name?.message}>
          <Input id="p-name" {...form.register("name")} />
        </Field>
        <Field label="Phone" htmlFor="p-phone">
          <Input id="p-phone" {...form.register("phone")} />
        </Field>
        <Field label="I am a…" htmlFor="p-type">
          <Select id="p-type" {...form.register("buyerType")}>
            {BUYER_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUYER_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="GSTIN (for business invoices)" htmlFor="p-gst" error={e.gstin?.message}>
          <Input id="p-gst" {...form.register("gstin")} className="font-mono uppercase" />
        </Field>
        <Button type="submit" loading={form.formState.isSubmitting} className="sm:col-span-2">
          Save profile
        </Button>
      </form>
    </div>
  );
}

export function PasswordForm() {
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { current: "", password: "", confirm: "" } });
  const e = form.formState.errors;
  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await changePassword(v);
        if (r.ok) {
          toast.success(r.message);
          form.reset();
        } else toast.error(r.error);
      })}
    >
      <Field label="Current password" htmlFor="cp-cur" error={e.current?.message}>
        <Input id="cp-cur" type="password" autoComplete="current-password" {...form.register("current")} />
      </Field>
      <Field label="New password" htmlFor="cp-new" error={e.password?.message}>
        <Input id="cp-new" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="cp-conf" error={e.confirm?.message}>
        <Input id="cp-conf" type="password" autoComplete="new-password" {...form.register("confirm")} />
      </Field>
      <Button type="submit" variant="outline" loading={form.formState.isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
