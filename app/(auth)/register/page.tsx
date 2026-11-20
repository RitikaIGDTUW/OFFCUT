import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <p className="spec text-[11px] text-graphite">New here</p>
      <h1 className="mb-8 mt-2 text-6xl leading-none">
        Create an <em>account</em>
      </h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
