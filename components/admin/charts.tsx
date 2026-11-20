"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatNumber } from "@/lib/utils";

/**
 * Admin charts. Each is single-series, so one ink hue carries the data (no legend needed —
 * the panel title names the series). Colours use `currentColor` so they follow light/dark mode.
 * Grid and axes are recessive; every chart has a hover tooltip.
 */
const axis = { stroke: "currentColor", strokeOpacity: 0.35, fontSize: 11, fontFamily: "var(--font-mono)" } as const;

function TipBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink bg-paper px-3 py-2 text-xs text-ink">
      <p className="spec text-[10px] text-graphite">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

type TipProps = { active?: boolean; label?: string | number; payload?: { value?: number | string; payload?: Record<string, unknown> }[] };

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <div className="h-64 text-ink" role="img" aria-label="Revenue per day for the last 30 days">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
          <Tooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }}
            content={({ active, label, payload }: TipProps) => (active && payload?.length ? <TipBox label={String(label)} value={formatINR(Number(payload[0].value))} /> : null)}
          />
          <Line type="monotone" dataKey="revenue" stroke="currentColor" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "rgb(255,91,31)", stroke: "currentColor" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, money, label }: { data: { name: string; value: number }[]; money?: boolean; label: string }) {
  const fmt = (v: number) => (money ? formatINR(v) : formatNumber(v));
  return (
    <div className="text-ink" style={{ height: Math.max(160, data.length * 34 + 30) }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v: number) => (money && v >= 1000 ? `₹${Math.round(v / 1000)}k` : String(v))} />
          <YAxis type="category" dataKey="name" tick={{ ...axis, strokeOpacity: 1 }} tickLine={false} axisLine={{ stroke: "currentColor", strokeOpacity: 0.3 }} width={120} />
          <Tooltip
            cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
            content={({ active, payload }: TipProps) =>
              active && payload?.length ? <TipBox label={String(payload[0].payload?.name ?? "")} value={fmt(Number(payload[0].value))} /> : null
            }
          />
          <Bar dataKey="value" fill="currentColor" radius={[0, 2, 2, 0]} maxBarSize={18} label={{ position: "right", fontSize: 11, fontFamily: "var(--font-mono)", fill: "currentColor", formatter: (v: number) => fmt(v) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
