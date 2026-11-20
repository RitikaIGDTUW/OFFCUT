import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="mb-8 text-6xl leading-none">
        New <em>password</em>
      </h1>
      <ResetForm token={token} />
    </>
  );
}
