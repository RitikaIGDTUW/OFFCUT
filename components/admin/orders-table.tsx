"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { Input, Select } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/primitives";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/utils";

type Row = { _id: string; orderNumber: string; email: string; total: number; orderStatus: string; paymentStatus: string; paymentMethod: string; createdAt: string; lots: number; flag: string };

export function OrdersTable({ rows, initialSearch }: { rows: Row[]; initialSearch?: string }) {
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const data = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!status || r.orderStatus === status) &&
          (!payment || r.paymentStatus === payment) &&
          (!from || r.createdAt >= from) &&
          (!to || r.createdAt <= `${to}T23:59:59`),
      ),
    [rows, status, payment, from, to],
  );
  const columns: ColumnDef<Row, unknown>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order",
      cell: ({ row }) => (
        <Link href={`/admin/orders/${row.original._id}`} className="font-mono text-xs underline">
          {row.original.orderNumber}
        </Link>
      ),
    },
    { accessorKey: "email", header: "Customer" },
    { accessorKey: "createdAt", header: "Placed", cell: ({ getValue }) => <span className="text-xs">{formatDateTime(getValue() as string)}</span> },
    { accessorKey: "lots", header: "Lots" },
    { accessorKey: "paymentMethod", header: "Method", cell: ({ getValue }) => <span className="spec text-[10px]">{getValue() as string}</span> },
    { accessorKey: "paymentStatus", header: "Payment", cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      accessorKey: "orderStatus",
      header: "Status",
      cell: ({ row }) => (
        <span className="flex gap-1">
          <StatusBadge status={row.original.orderStatus} />
          {row.original.flag ? <Badge tone="signal">{row.original.flag}</Badge> : null}
        </span>
      ),
    },
    { accessorKey: "total", header: "Total", cell: ({ getValue }) => <span className="font-mono">{formatINR(getValue() as number)}</span> },
  ];
  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Order # or email…"
      initialSearch={initialSearch}
      toolbar={
        <>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36" aria-label="Order status">
            <option value="">Any status</option>
            {ORDER_STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={payment} onChange={(e) => setPayment(e.target.value)} className="w-36" aria-label="Payment status">
            <option value="">Any payment</option>
            {PAYMENT_STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
        </>
      }
    />
  );
}
