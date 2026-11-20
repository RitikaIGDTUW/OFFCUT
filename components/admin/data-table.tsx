"use client";
import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable admin table built on TanStack Table: global search, sortable headers,
 * column visibility toggles, optional row selection with a bulk-action bar, pagination.
 */
export function DataTable<T extends { _id: string }>({
  data,
  columns,
  searchPlaceholder = "Search…",
  selectable,
  bulkActions,
  toolbar,
  pageSize = 20,
  initialSearch = "",
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  selectable?: boolean;
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
  initialSearch?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialSearch);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [selection, setSelection] = useState<RowSelectionState>({});

  const allColumns: ColumnDef<T, unknown>[] = selectable
    ? [
        {
          id: "select",
          enableSorting: false,
          enableHiding: false,
          header: ({ table }) => (
            <input
              type="checkbox"
              aria-label="Select all rows on this page"
              className="accent-[#183D35]"
              checked={table.getIsAllPageRowsSelected()}
              onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            />
          ),
          cell: ({ row }) => (
            <input type="checkbox" aria-label="Select row" className="accent-[#183D35]" checked={row.getIsSelected()} onChange={(e) => row.toggleSelected(e.target.checked)} />
          ),
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, columnVisibility: visibility, rowSelection: selection },
    getRowId: (r) => r._id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={searchPlaceholder} className="max-w-xs" aria-label="Search table" />
        {toolbar}
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button variant="outline" size="md" className="ml-auto">
              <Columns3 size={14} /> Columns
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content align="end" className="z-50 min-w-[180px] border border-ink bg-paper p-1">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <Dropdown.CheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(Boolean(v))}
                    onSelect={(e) => e.preventDefault()}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-paper-2"
                  >
                    <span className="w-3">{c.getIsVisible() ? "✓" : ""}</span>
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </Dropdown.CheckboxItem>
                ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>

      {selectable && selectedIds.length > 0 && bulkActions ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-ink bg-paper-2 px-3 py-2">
          <span className="spec text-[11px]">{selectedIds.length} selected</span>
          {bulkActions(selectedIds, () => setSelection({}))}
        </div>
      ) : null}

      <div className="overflow-x-auto border border-ink">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-paper-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="spec whitespace-nowrap border-b border-ink px-3 py-2 text-left text-[10px] font-normal text-graphite">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? <ArrowUp size={11} /> : h.column.getIsSorted() === "desc" ? <ArrowDown size={11} /> : null}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="px-3 py-10 text-center text-graphite">
                  No rows.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((r) => (
                <tr key={r.id} className={cn("border-t border-rule hover:bg-paper-2/60", r.getIsSelected() && "bg-signal/10")}>
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-3 py-2 align-middle">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-mono text-graphite">
          {table.getFilteredRowModel().rows.length} rows · page {table.getState().pagination.pageIndex + 1}/{Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            ← Prev
          </Button>
          <Button size="sm" variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
