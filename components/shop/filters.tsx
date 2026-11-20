"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { RangeSlider, Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { CONDITIONS, CONDITION_LABEL, COLOUR_SWATCHES, GRADES, UNIT_TYPES } from "@/lib/constants";
import { cn, formatINR } from "@/lib/utils";

type Facets = {
  materials: string[];
  colours: string[];
  max: { price: number; kg: number; len: number; wid: number; thick: number };
};
type Cat = { name: string; slug: string; count: number };

/** Hook that reads/writes filters in the URL (so every filter state is shareable/bookmarkable). */
function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // any filter change resets pagination
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const getList = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const toggle = (k: string, v: string) => {
    const cur = getList(k);
    set({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") });
  };
  return { params, set, toggle, getList, pending };
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-rule py-4">
      <legend className="spec mb-3 text-[10px] text-graphite">{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("spec border px-2 py-1 text-[10px]", active ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink")}
    >
      {children}
    </button>
  );
}

function SliderFilter({ label, k1, k2, max, unit, step = 1 }: { label: string; k1: string; k2?: string; max: number; unit: string; step?: number }) {
  const { params, set } = useQueryState();
  const init = [Number(params.get(k1) ?? 0), ...(k2 ? [Number(params.get(k2) ?? max)] : [])];
  const [val, setVal] = useState<number[]>(init);
  const safeMax = Math.max(max, step);
  return (
    <Group title={label}>
      <RangeSlider
        label={label}
        min={0}
        max={safeMax}
        step={step}
        value={val}
        onValueChange={setVal}
        onValueCommit={(v) => set({ [k1]: v[0] ? String(v[0]) : null, ...(k2 ? { [k2]: v[1] < safeMax ? String(v[1]) : null } : {}) })}
      />
      <p className="spec mt-2 flex justify-between text-[10px] text-graphite">
        <span>
          {k2 ? "" : "≥ "}
          {unit === "₹" ? formatINR(val[0]) : `${val[0]} ${unit}`}
        </span>
        {k2 ? <span>{unit === "₹" ? formatINR(val[1]) : `${val[1]} ${unit}`}</span> : <span>max {safeMax}</span>}
      </p>
    </Group>
  );
}

export function FilterPanel({ facets, categories, activeCategory }: { facets: Facets; categories: Cat[]; activeCategory?: string }) {
  const { params, set, toggle, getList, pending } = useQueryState();
  const activeCount = [...params.keys()].filter((k) => !["sort", "view", "page", "q"].includes(k)).length;
  return (
    <div aria-busy={pending} className={cn(pending && "opacity-70")}>
      <div className="flex items-center justify-between border-b border-ink pb-3">
        <p className="spec text-xs">Filters {activeCount ? `(${activeCount})` : ""}</p>
        {activeCount ? (
          <Link href={activeCategory ? `/shop/${activeCategory}` : "/shop"} className="spec text-[10px] underline">
            Clear all
          </Link>
        ) : null}
      </div>

      <Group title="Category">
        <ul className="space-y-1.5 text-sm">
          <li>
            <Link href="/shop" className={cn("hover:underline", !activeCategory && "font-semibold")}>
              All materials
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug} className="flex justify-between">
              <Link href={`/shop/${c.slug}`} className={cn("hover:underline", activeCategory === c.slug && "font-semibold underline decoration-signal")}>
                {c.name}
              </Link>
              <span className="font-mono text-[11px] text-graphite">{c.count}</span>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Material type">
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {facets.materials.map((m) => (
            <Chip key={m} active={getList("material").includes(m)} onClick={() => toggle("material", m)}>
              {m}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Grade">
        <div className="flex gap-1.5">
          {GRADES.map((g) => (
            <Chip key={g} active={getList("grade").includes(g)} onClick={() => toggle("grade", g)}>
              Grade {g}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Condition">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <Chip key={c} active={getList("condition").includes(c)} onClick={() => toggle("condition", c)}>
              {CONDITION_LABEL[c]}
            </Chip>
          ))}
        </div>
      </Group>

      <SliderFilter label="Min length (mm)" k1="minL" max={facets.max.len} unit="mm" step={10} />
      <SliderFilter label="Min width (mm)" k1="minW" max={facets.max.wid} unit="mm" step={10} />
      <SliderFilter label="Thickness (mm)" k1="minT" k2="maxT" max={facets.max.thick} unit="mm" step={0.5} />
      <SliderFilter label="Weight per unit (kg)" k1="minKg" k2="maxKg" max={facets.max.kg} unit="kg" step={0.1} />
      <SliderFilter label="Price" k1="minPrice" k2="maxPrice" max={facets.max.price} unit="₹" step={50} />

      <Group title="Colour">
        <div className="flex flex-wrap gap-2">
          {facets.colours.map((c) => {
            const active = getList("colour").includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle("colour", c)}
                aria-pressed={active}
                title={c}
                className={cn("flex items-center gap-1.5 border px-1.5 py-1 text-xs", active ? "border-ink bg-paper-2" : "border-rule")}
              >
                <span className="h-3.5 w-3.5 border border-ink" style={{ background: COLOUR_SWATCHES[c] ?? "#ccc" }} aria-hidden />
                {c}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Sold by">
        <div className="flex flex-wrap gap-1.5">
          {UNIT_TYPES.map((u) => (
            <Chip key={u} active={getList("unit").includes(u)} onClick={() => toggle("unit", u)}>
              {u}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Availability">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-[#183D35]" checked={params.get("inStock") === "1"} onChange={(e) => set({ inStock: e.target.checked ? "1" : null })} />
            In stock only
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-[#183D35]" checked={params.get("byWeight") === "1"} onChange={(e) => set({ byWeight: e.target.checked ? "1" : null })} />
            Sold by weight (₹/kg)
          </label>
        </div>
      </Group>
    </div>
  );
}

/** Mobile: filters open in a sheet. */
export function MobileFilters(props: { facets: Facets; categories: Cat[]; activeCategory?: string }) {
  return (
    <Dialog>
      <DialogTrigger className="spec flex h-9 items-center gap-2 border border-ink px-3 text-[11px] lg:hidden">
        <SlidersHorizontal size={14} /> Filters
      </DialogTrigger>
      <DialogContent title="Filter lots" side="left">
        <FilterPanel {...props} />
      </DialogContent>
    </Dialog>
  );
}

export function SortAndView({ sorts }: { sorts: { key: string; label: string }[] }) {
  const { params, set } = useQueryState();
  const view = params.get("view") ?? "grid";
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="sr-only">
        Sort
      </label>
      <select
        id="sort"
        value={params.get("sort") ?? "newest"}
        onChange={(e) => set({ sort: e.target.value === "newest" ? null : e.target.value })}
        className="spec h-9 border border-ink bg-paper px-2 text-[11px]"
      >
        {sorts.map((s) => (
          <option key={s.key} value={s.key}>
            Sort: {s.label}
          </option>
        ))}
      </select>
      <div className="flex border border-ink" role="group" aria-label="View">
        <button onClick={() => set({ view: null })} aria-pressed={view === "grid"} className={cn("grid h-9 w-9 place-items-center", view === "grid" && "bg-ink text-paper")} aria-label="Grid view">
          <LayoutGrid size={15} />
        </button>
        <button onClick={() => set({ view: "list" })} aria-pressed={view === "list"} className={cn("grid h-9 w-9 place-items-center border-l border-ink", view === "list" && "bg-ink text-paper")} aria-label="List view (spec table)">
          <List size={15} />
        </button>
      </div>
    </div>
  );
}
