import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small presentational building blocks used across the app. */

type Tone = "ink" | "signal" | "moss" | "steel" | "oxide" | "rule";
const tones: Record<Tone, string> = {
  ink: "border-ink bg-ink text-paper",
  signal: "border-ink bg-signal text-signal-ink",
  moss: "border-moss bg-moss text-paper",
  steel: "border-steel bg-steel text-ink",
  oxide: "border-oxide bg-oxide text-paper",
  rule: "border-rule bg-paper-2 text-graphite",
};

export function Badge({ tone = "rule", className, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("spec inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] leading-none", tones[tone], className)}
      {...p}
    />
  );
}

/** Eyebrow label above section titles: "— 02 / HOW IT WORKS" */
export function Eyebrow({ index, children, className }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <p className={cn("spec flex items-center gap-3 text-[11px] text-graphite", className)}>
      {index ? <span className="text-ink">{index}</span> : null}
      <span className="h-px w-8 bg-ink" aria-hidden />
      {children}
    </p>
  );
}

export function Panel({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-ink bg-paper-2", className)} {...p} />;
}

/** Empty states are "illustrated" in type — no clip-art. */
export function EmptyState({
  code = "000",
  title,
  children,
  action,
}: {
  code?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center border border-dashed border-ink/50 px-6 py-16 text-center">
      <p className="spec text-[11px] text-graphite">LOT #{code} · NOTHING ON THE FLOOR</p>
      <p className="mt-3 font-display text-5xl italic leading-none sm:text-6xl">{title}</p>
      {children ? <div className="mt-4 max-w-md text-sm text-graphite">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-paper-2", className)} aria-hidden />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "moss" | "signal" }) {
  return (
    <div className="border border-ink bg-paper p-4">
      <p className="spec text-[10px] text-graphite">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl", tone === "moss" && "text-moss", tone === "signal" && "text-signal")}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-graphite">{sub}</p> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 border-b border-ink pb-6">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1 className="mt-3 text-5xl leading-none sm:text-6xl">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-graphite">{children}</div> : null}
    </header>
  );
}

/** Responsive table wrapper with mono header row. */
export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-ink">
      <table className={cn("w-full border-collapse text-sm [&_td]:border-t [&_td]:border-rule [&_td]:px-3 [&_td]:py-2 [&_th]:spec [&_th]:bg-paper-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-normal [&_th]:text-graphite", className)}>
        {children}
      </table>
    </div>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  active: "moss",
  paid: "moss",
  delivered: "moss",
  verified: "moss",
  listed: "moss",
  accepted: "moss",
  matched: "moss",
  placed: "rule",
  pending: "rule",
  new: "rule",
  open: "rule",
  draft: "rule",
  confirmed: "steel",
  packed: "steel",
  reviewing: "steel",
  "pending-review": "steel",
  "picked-up": "steel",
  shipped: "ink",
  "offer-sent": "signal",
  "sold-out": "ink",
  cancelled: "oxide",
  failed: "oxide",
  rejected: "oxide",
  returned: "oxide",
  refunded: "oxide",
  archived: "rule",
  closed: "rule",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "rule"}>{status.replace(/-/g, " ")}</Badge>;
}
