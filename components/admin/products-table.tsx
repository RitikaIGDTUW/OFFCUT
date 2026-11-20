"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { bulkProducts, duplicateProduct, importProductsCsv, type BulkAction } from "@/actions/admin/catalog";
import { DataTable } from "./data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { formatINR } from "@/lib/utils";

export type ProductRow = {
  _id: string;
  lotNumber: string;
  title: string;
  slug: string;
  price: number;
  qty: number;
  status: string;
  featured: boolean;
  views: number;
  sold: number;
  discount: number;
  image: string;
  category: string;
};

export function ProductsTable({ rows, categories }: { rows: ProductRow[]; categories: { _id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [statusFilter, setStatusFilter] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const data = useMemo(() => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows), [rows, statusFilter]);

  const run = (ids: string[], action: BulkAction, clear: () => void) =>
    start(async () => {
      if (action === "delete" && !window.confirm(`Delete ${ids.length} lot(s) permanently? Photos uploaded to UploadThing are deleted too.`)) return;
      const r = await bulkProducts(ids, action, moveTo);
      if (r.ok) {
        toast.success(r.message);
        clear();
        router.refresh();
      } else toast.error(r.error);
    });

  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      accessorKey: "lotNumber",
      header: "Lot",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="relative h-9 w-9 shrink-0 border border-ink bg-paper-2">{row.original.image ? <SafeImage src={row.original.image} alt="" fill sizes="36px" className="object-cover" /> : null}</span>
          <span className="font-mono text-xs">#{row.original.lotNumber}</span>
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link href={`/admin/products/${row.original._id}`} className="font-medium hover:underline">
          {row.original.title}
          {row.original.featured ? <span className="ml-2 text-signal">★</span> : null}
        </Link>
      ),
    },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "price", header: "Price", cell: ({ getValue }) => <span className="font-mono">{formatINR(getValue() as number)}</span> },
    { accessorKey: "discount", header: "% off", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}%</span> },
    { accessorKey: "qty", header: "Stock", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
    { accessorKey: "sold", header: "Sold", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
    { accessorKey: "views", header: "Views", cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex gap-2 text-xs">
          <Link href={`/admin/products/${row.original._id}`} className="underline">
            Edit
          </Link>
          <button
            className="underline"
            onClick={() =>
              start(async () => {
                const r = await duplicateProduct(row.original._id);
                if (r.ok && r.data) {
                  toast.success(r.message);
                  router.push(`/admin/products/${r.data.id}`);
                } else if (!r.ok) toast.error(r.error);
              })
            }
          >
            Duplicate
          </button>
          {row.original.status === "active" || row.original.status === "sold-out" ? (
            <Link href={`/lot/${row.original.slug}`} target="_blank" className="underline">
              View
            </Link>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        selectable
        searchPlaceholder="Search lot #, title, category…"
        toolbar={
          <>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" aria-label="Filter by status">
              <option value="">All statuses</option>
              {["draft", "pending-review", "active", "sold-out", "archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button asChild variant="outline">
              <a href="/api/admin/export?type=products">Export CSV</a>
            </Button>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" loading={pending} onClick={() => run(ids, "activate", clear)}>
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(ids, "archive", clear)}>
              Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(ids, "feature", clear)}>
              Feature
            </Button>
            <Button size="sm" variant="outline" onClick={() => run(ids, "unfeature", clear)}>
              Unfeature
            </Button>
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="h-8 w-44 py-0 text-xs" aria-label="Move to category">
              <option value="">Move to category…</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" disabled={!moveTo} onClick={() => run(ids, "category", clear)}>
              Move
            </Button>
            <Button size="sm" variant="danger" onClick={() => run(ids, "delete", clear)}>
              Delete
            </Button>
          </>
        )}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent title="Import lots from CSV" description="Imported lots are created as drafts unless the status column says otherwise.">
          <p className="mb-3 break-words font-mono text-[11px] text-graphite">
            title,category,materialType,grade,gradeDetail,condition,length,width,thickness,unit,weightKg,quantity,unitType,sellByWeight,price,retailPrice,colour,finish,origin,tags,imageUrl,status
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="text-sm" aria-label="CSV file" />
          <Button
            className="mt-4"
            loading={pending}
            onClick={() => {
              const f = fileRef.current?.files?.[0];
              if (!f) return toast.error("Choose a CSV file");
              start(async () => {
                const r = await importProductsCsv(await f.text());
                if (r.ok) {
                  toast.success(r.message);
                  setImportErrors(r.data?.errors ?? []);
                  router.refresh();
                } else toast.error(r.error);
              });
            }}
          >
            Import
          </Button>
          {importErrors.length ? (
            <ul className="mt-4 max-h-48 overflow-y-auto border border-oxide p-2 text-xs text-oxide">
              {importErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
