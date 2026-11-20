import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/primitives";

/** Shared editorial layout for static content pages. */
export function ProsePage({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <section className="relative border-b border-ink">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="container-x relative py-16">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-4xl text-6xl leading-[0.95] md:text-8xl">{title}</h1>
          {intro ? <p className="mt-6 max-w-2xl text-lg text-graphite">{intro}</p> : null}
        </div>
      </section>
      <div className="container-x py-14">
        <div className="prose-offcut max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
