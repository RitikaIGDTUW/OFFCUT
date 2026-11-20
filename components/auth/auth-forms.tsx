"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validations/auth";
import { registerUser, requestPasswordReset, resetPassword } from "@/actions/auth";
import { BUYER_TYPES, BUYER_TYPE_LABEL } from "@/lib/constants";
import { useFeatures } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

function safeCallback(url: string | null) {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/account";
}

function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const { google } = useFeatures();
  if (!google) return null;
  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl })}>
        Continue with Google
      </Button>
      <p className="spec my-4 text-center text-[10px] text-graphite">— or —</p>
    </>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get("callbackUrl"));
  const [error, setError] = useState(params.get("error") ? "Sign-in failed. Check your details." : "");
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const e = form.formState.errors;

  return (
    <>
      <GoogleButton callbackUrl={callbackUrl} />
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (v) => {
          setError("");
          const res = await signIn("credentials", { ...v, redirect: false });
          if (res?.error) return setError("Wrong email or password, or the account is blocked.");
          toast.success("Signed in");
          router.push(callbackUrl);
          router.refresh();
        })}
      >
        <Field label="Email" htmlFor="email" error={e.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!e.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={e.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} aria-invalid={!!e.password} />
        </Field>
        {error ? (
          <p role="alert" className="border border-oxide px-3 py-2 text-sm text-oxide">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="signal" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Sign in
        </Button>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="underline-offset-4 hover:underline">
            Forgot password?
          </Link>
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline decoration-signal underline-offset-4">
            Create account
          </Link>
        </div>
      </form>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const asSupplier = params.get("as") === "supplier";
  const callbackUrl = asSupplier ? "/supplier/onboarding" : safeCallback(params.get("callbackUrl"));
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "", buyerType: asSupplier ? ("business" as const) : ("maker" as const), accountType: asSupplier ? ("supplier" as const) : ("buyer" as const) },
  });
  const e = form.formState.errors;

  return (
    <>
      <GoogleButton callbackUrl={callbackUrl} />
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (v) => {
          const r = await registerUser(v);
          if (!r.ok) {
            Object.entries(r.fieldErrors ?? {}).forEach(([k, msgs]) => form.setError(k as "email", { message: msgs?.[0] }));
            return void toast.error(r.error);
          }
          await signIn("credentials", { email: v.email, password: v.password, redirect: false });
          toast.success("Welcome to OFFCUT! Check your inbox to verify your email.");
          router.push(callbackUrl);
          router.refresh();
        })}
      >
        <Field label="Full name" htmlFor="name" error={e.name?.message}>
          <Input id="name" autoComplete="name" {...form.register("name")} aria-invalid={!!e.name} />
        </Field>
        <Field label="Email" htmlFor="r-email" error={e.email?.message}>
          <Input id="r-email" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!e.email} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="r-pw" error={e.password?.message} hint="8+ chars, a letter and a number">
            <Input id="r-pw" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={!!e.password} />
          </Field>
          <Field label="Confirm" htmlFor="r-pw2" error={e.confirm?.message}>
            <Input id="r-pw2" type="password" autoComplete="new-password" {...form.register("confirm")} aria-invalid={!!e.confirm} />
          </Field>
        </div>
        <Field label="I am a…" htmlFor="buyerType">
          <Select id="buyerType" {...form.register("buyerType")}>
            {BUYER_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUYER_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="spec mb-2 text-[11px] text-graphite">Account type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["buyer", "supplier"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 border border-ink px-3 py-2 text-sm has-[:checked]:bg-paper-2">
                <input type="radio" value={t} {...form.register("accountType")} className="accent-[#183D35]" />
                {t === "buyer" ? "I want to buy" : "I'm a factory / supplier"}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" variant="signal" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Create account
        </Button>
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline decoration-signal underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState("");
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  if (sent) return <p className="border border-moss p-4 text-sm text-moss">{sent}</p>;
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await requestPasswordReset(v);
        if (r.ok) setSent(r.message ?? "Sent");
        else toast.error(r.error);
      })}
    >
      <Field label="Email" htmlFor="f-email" error={form.formState.errors.email?.message}>
        <Input id="f-email" type="email" {...form.register("email")} />
      </Field>
      <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token, password: "", confirm: "" } });
  const e = form.formState.errors;
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (v) => {
        const r = await resetPassword(v);
        if (r.ok) {
          toast.success(r.message);
          router.push("/login");
        } else toast.error(r.error);
      })}
    >
      <Field label="New password" htmlFor="n-pw" error={e.password?.message}>
        <Input id="n-pw" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Field label="Confirm" htmlFor="n-pw2" error={e.confirm?.message}>
        <Input id="n-pw2" type="password" autoComplete="new-password" {...form.register("confirm")} />
      </Field>
      <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
        Set new password
      </Button>
    </form>
  );
}
