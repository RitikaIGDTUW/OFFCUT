import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmailToken } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await verifyEmailToken(token);
  return (
    <>
      <h1 className="text-6xl leading-none">{r.ok ? <>Email <em>verified.</em></> : <>Link <em>expired.</em></>}</h1>
      <p className="mt-4 text-graphite">{r.ok ? "Thanks — your email address is confirmed." : r.error}</p>
      <Button asChild className="mt-8">
        <Link href={r.ok ? "/shop" : "/account"}>{r.ok ? "Start browsing" : "Go to my account"}</Link>
      </Button>
    </>
  );
}
