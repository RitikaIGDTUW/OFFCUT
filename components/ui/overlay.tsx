"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { X, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ───────── Dialog & side Sheet (Radix, restyled) ───────── */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  side,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "left";
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col border border-ink bg-paper text-ink focus:outline-none",
          side
            ? cn("inset-y-0 w-full max-w-md", side === "right" ? "right-0 border-r-0" : "left-0 border-l-0")
            : "left-1/2 top-1/2 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink px-5 py-4">
          <div>
            <DialogPrimitive.Title className="font-display text-2xl leading-none">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-graphite">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="border border-ink p-1 hover:bg-ink hover:text-paper" aria-label="Close">
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        <div className={cn("p-5", side && "flex-1 overflow-y-auto")}>{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ───────── Accordion (FAQ) ───────── */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="border-t border-ink">
      {items.map((it, i) => (
        <AccordionPrimitive.Item key={i} value={`item-${i}`} className="border-b border-ink">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left">
              <span className="flex items-baseline gap-4">
                <span className="spec text-[11px] text-graphite">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg font-medium">{it.q}</span>
              </span>
              <Plus size={18} className="shrink-0 transition-transform group-data-[state=open]:rotate-45" aria-hidden />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden pb-5 pl-10 text-graphite">{it.a}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}

/* ───────── Range slider ───────── */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  onValueCommit,
  label,
}: {
  min: number;
  max: number;
  step?: number;
  value: number[];
  onValueChange: (v: number[]) => void;
  onValueCommit?: (v: number[]) => void;
  label: string;
}) {
  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      className="relative flex h-5 w-full touch-none select-none items-center"
      aria-label={label}
    >
      <SliderPrimitive.Track className="relative h-px grow bg-ink/40">
        <SliderPrimitive.Range className="absolute h-[3px] -translate-y-px bg-ink" />
      </SliderPrimitive.Track>
      {value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={`${label} ${i === 0 ? "minimum" : "maximum"}`}
          className="block h-4 w-3 border border-ink bg-signal focus-visible:outline-2 focus-visible:outline-ink"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
