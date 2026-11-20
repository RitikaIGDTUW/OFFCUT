import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="relative w-full max-w-xl border border-ink p-10 text-center">
        <span className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full border border-ink" aria-hidden />
        <p className="spec text-[11px] text-graphite">LOT #404 · GRADE ?</p>
        <h1 className="mt-6 text-7xl leading-none md:text-8xl">
          Off the <em className="text-signal">grid.</em>
        </h1>
        <p className="mt-4 text-graphite">This page was cut, sold, or never existed.</p>
        <div className="barcode mx-auto mt-8 w-48" aria-hidden />
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="signal">
            <Link href="/shop">Browse lots</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
