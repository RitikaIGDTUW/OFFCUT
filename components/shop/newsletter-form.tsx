"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/actions/public";
import { cn } from "@/lib/utils";

export function NewsletterForm({ dark }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className={cn("flex border", dark ? "border-paper/60" : "border-ink")}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await subscribeNewsletter({ email });
          if (r.ok) {
            toast.success(r.message);
            setEmail("");
          } else toast.error(r.error);
        });
      }}
    >
      <label htmlFor={dark ? "nl-footer" : "nl-main"} className="sr-only">
        Email address
      </label>
      <input
        id={dark ? "nl-footer" : "nl-main"}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.in"
        className={cn("h-11 min-w-0 flex-1 bg-transparent px-3 text-sm focus:outline-none", dark ? "placeholder:text-paper/50" : "placeholder:text-graphite/70")}
      />
      <button
        disabled={pending}
        className="spec h-11 border-l border-inherit bg-signal px-4 text-[11px] font-bold text-signal-ink hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "…" : "Subscribe"}
      </button>
    </form>
  );
}
