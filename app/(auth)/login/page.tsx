import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <p className="spec text-[11px] text-graphite">Account</p>
      <h1 className="mb-8 mt-2 text-6xl leading-none">
        Sign <em>in</em>
      </h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="spec mt-8 border-t border-rule pt-4 text-[10px] text-graphite">
        Demo: admin@offcut.test / Admin@123 · buyer@offcut.test / Buyer@123 · tannery@offcut.test / Supplier@123
      </p>
    </>
  );
}
