"use client";
import { useState } from "react";
import { DIM_UNITS, CONDITION_LABEL } from "@/lib/constants";
import { cn, fmtLen, fromMM, toMM, type DimUnit } from "@/lib/utils";

type Dims = { length: number; width: number; thickness?: number | null; unit: DimUnit };

/** Spec-sheet table with an mm / cm / in / m unit converter toggle. */
export function SpecSheet({
  dims,
  rows,
  isRoll,
  rollLength,
}: {
  dims: Dims;
  rows: [string, string | undefined | null][];
  isRoll?: boolean;
  rollLength?: number | null;
}) {
  const [unit, setUnit] = useState<DimUnit>(dims.unit);
  const conv = (v?: number | null) => (v ? fmtLen(fromMM(toMM(v, dims.unit), unit), unit === "in" ? 2 : unit === "m" ? 3 : 1) : "—");
  return (
    <div className="border border-ink">
      <div className="flex items-center justify-between border-b border-ink bg-paper-2 px-4 py-2">
        <p className="spec text-[11px]">Spec sheet</p>
        <div className="flex" role="group" aria-label="Units">
          {DIM_UNITS.map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={cn("spec border border-ink px-2 py-0.5 text-[10px] -ml-px", unit === u ? "bg-ink text-paper" : "bg-paper")}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-[minmax(120px,40%)_1fr] text-sm [&>dd]:border-t [&>dd]:border-rule [&>dd]:px-4 [&>dd]:py-2 [&>dd]:font-mono [&>dd]:text-[13px] [&>dt]:border-t [&>dt]:border-rule [&>dt]:px-4 [&>dt]:py-2 [&>dt]:text-graphite">
        <dt className="!border-t-0">Length</dt>
        <dd className="!border-t-0">
          {conv(dims.length)} {unit}
        </dd>
        <dt>Width</dt>
        <dd>
          {conv(dims.width)} {unit}
        </dd>
        <dt>Thickness</dt>
        <dd>{dims.thickness ? `${conv(dims.thickness)} ${unit}` : "—"}</dd>
        {isRoll && rollLength ? (
          <>
            <dt>Roll length</dt>
            <dd>{fmtLen(rollLength)} m</dd>
          </>
        ) : null}
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <FragmentRow key={k} k={k} v={v as string} />
          ))}
      </dl>
    </div>
  );
}
function FragmentRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{k === "Condition" ? CONDITION_LABEL[v as keyof typeof CONDITION_LABEL] ?? v : v}</dd>
    </>
  );
}

/**
 * "Will it fit?" — the buyer enters the piece size they need; we compute how many pieces can be
 * cut from one unit (trying both orientations) and from the whole available stock.
 */
export function WillItFit({ dims, isRoll, rollLength, qty, unitLabel }: { dims: Dims; isRoll?: boolean; rollLength?: number | null; qty: number; unitLabel: string }) {
  const [unit, setUnit] = useState<DimUnit>("mm");
  const [needL, setNeedL] = useState("");
  const [needW, setNeedW] = useState("");

  const sheetL = isRoll && rollLength ? rollLength * 1000 : toMM(dims.length, dims.unit);
  const sheetW = toMM(dims.width, dims.unit);
  const l = Number(needL) ? toMM(Number(needL), unit) : 0;
  const w = Number(needW) ? toMM(Number(needW), unit) : 0;

  let perUnit = 0;
  if (l > 0 && w > 0) {
    const a = Math.floor(sheetL / l) * Math.floor(sheetW / w);
    const b = Math.floor(sheetL / w) * Math.floor(sheetW / l);
    perUnit = Math.max(a, b);
  }
  const usedPct = perUnit ? Math.round(((perUnit * l * w) / (sheetL * sheetW)) * 100) : 0;

  return (
    <div className="border border-ink p-4">
      <p className="font-display text-2xl">Will it fit?</p>
      <p className="mt-1 text-sm text-graphite">Enter the size of the piece you need to cut.</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
        <label className="text-xs">
          <span className="spec mb-1 block text-[10px] text-graphite">Length</span>
          <input inputMode="decimal" value={needL} onChange={(e) => setNeedL(e.target.value)} className="h-10 w-full border border-ink bg-paper px-2 font-mono text-sm" />
        </label>
        <span className="pb-2 font-mono">×</span>
        <label className="text-xs">
          <span className="spec mb-1 block text-[10px] text-graphite">Width</span>
          <input inputMode="decimal" value={needW} onChange={(e) => setNeedW(e.target.value)} className="h-10 w-full border border-ink bg-paper px-2 font-mono text-sm" />
        </label>
        <select aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value as DimUnit)} className="h-10 border border-ink bg-paper px-2 font-mono text-xs">
          {DIM_UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 min-h-[48px] font-mono text-sm" aria-live="polite">
        {l > 0 && w > 0 ? (
          perUnit > 0 ? (
            <p>
              <span className="text-2xl text-moss">{perUnit}</span> piece{perUnit > 1 ? "s" : ""} per {unitLabel} ({usedPct}% yield) ·{" "}
              <span className="text-moss">{perUnit * Math.max(qty, 0)}</span> from all available stock
            </p>
          ) : (
            <p className="text-oxide">Too big — this lot is {fmtLen(sheetL)} × {fmtLen(sheetW)} mm.</p>
          )
        ) : (
          <p className="text-graphite">Pieces cut from one {unitLabel} will appear here.</p>
        )}
      </div>
    </div>
  );
}
