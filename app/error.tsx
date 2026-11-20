"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  const dbDown = /MONGODB_URI|ECONNREFUSED|querySrv|Server selection timed out/i.test(error.message);
  return (
    <main id="main" className="grid min-h-[70vh] place-items-center px-6">
      <div className="w-full max-w-xl border border-ink p-10">
        <p className="spec text-[11px] text-oxide">FAULT · {error.digest ?? "E-500"}</p>
        <h1 className="mt-4 text-6xl leading-none">
          Something <em>jammed.</em>
        </h1>
        <p className="mt-4 text-graphite">
          {dbDown
            ? "Can't reach MongoDB. Check that MONGODB_URI in .env.local is correct and that your database is running."
            : "An unexpected error stopped this page from loading. Check the terminal running `npm run dev` for details."}
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
