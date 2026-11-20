import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-3 text-6xl leading-none">
        Forgot <em>password?</em>
      </h1>
      <p className="mb-8 text-graphite">We&apos;ll email you a link to choose a new one. It&apos;s valid for one hour.</p>
      <ForgotForm />
      <Link href="/login" className="mt-6 inline-block text-sm underline">
        ← Back to sign in
      </Link>
    </>
  );
}
