import Link from "next/link";
import { img } from "@/lib/seed-images";
import { SafeImage } from "@/components/ui/safe-image";

/** Split-screen layout for login / register / password pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden border-r border-ink lg:block">
        <SafeImage src={img("leather", 4)} alt="Pieces of leather laid out on a workbench" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-ink/30" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-paper">
          <p className="font-display text-5xl leading-none">
            Industrial-grade leftovers.
            <br />
            <em className="text-signal">Maker-grade prices.</em>
          </p>
        </div>
      </div>
      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between border-b border-ink px-6 py-4">
          <Link href="/" className="font-mono text-lg font-bold tracking-[0.18em]">
            OFFCUT
          </Link>
          <Link href="/shop" className="spec text-[11px] hover:underline">
            ← Back to shop
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
