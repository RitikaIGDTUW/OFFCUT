"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { adminSendPasswordReset, markPayoutPaid, setCommission, setUserBlocked, setUserRole, verifySupplier } from "@/actions/admin/people";
import { closeRequest, deleteCoupon, matchRequest, moderateReview, saveCoupon, type CouponInput } from "@/actions/admin/commerce";
import { adjustStock } from "@/actions/admin/catalog";
import { ROLES, type Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { DataTable } from "./data-table";
import { formatDate, formatINR } from "@/lib/utils";

type Result = { ok: boolean; message?: string; error?: string };
function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

/* ───────── Suppliers ───────── */
export function SupplierControls({ id, status, commission }: { id: string; status: string; commission: number }) {
  const { pending, run } = useAction();
  const [reason, setReason] = useState("");
  const [rate, setRate] = useState(String(commission));
  return (
    <div className="flex flex-wrap items-end gap-2">
      {status !== "verified" ? (
        <Button size="sm" variant="signal" loading={pending} onClick={() => run(() => verifySupplier(id, true))}>
          Verify
        </Button>
      ) : null}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Reject…
          </Button>
        </DialogTrigger>
        <DialogContent title="Reject supplier" description="The supplier sees this reason and can update their details.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" placeholder="GSTIN doesn't match the uploaded certificate." />
          <Button className="mt-3" variant="danger" loading={pending} onClick={() => run(() => verifySupplier(id, false, reason))}>
            Reject
          </Button>
        </DialogContent>
      </Dialog>
      <label className="flex items-center gap-1 text-xs">
        Commission
        <input value={rate} onChange={(e) => setRate(e.target.value)} className="h-8 w-14 border border-ink bg-paper px-1 font-mono" aria-label="Commission percent" />%
      </label>
      <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => setCommission(id, Number(rate)))}>
        Save
      </Button>
    </div>
  );
}

export function MarkPaidButton({ id }: { id: string }) {
  const { pending, run } = useAction();
  const [ref, setRef] = useState("");
  return (
    <span className="flex gap-1">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR / ref" className="h-7 w-28 border border-ink bg-paper px-1 font-mono text-[11px]" aria-label="Payment reference" />
      <Button size="sm" loading={pending} onClick={() => run(() => markPayoutPaid(id, ref))}>
        Mark paid
      </Button>
    </span>
  );
}

/* ───────── Users ───────── */
type UserRow = { _id: string; name: string; email: string; role: Role; isBlocked: boolean; orders: number; spent: number; createdAt: string; verified: boolean };
export function UsersTable({ rows, selfId }: { rows: UserRow[]; selfId: string }) {
  const { pending, run } = useAction();
  const columns: ColumnDef<UserRow, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-xs">{row.original.email} {row.original.verified ? <Badge tone="moss">verified</Badge> : null}</span> },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <select
          value={row.original.role}
          disabled={pending || row.original._id === selfId}
          onChange={(e) => run(() => setUserRole(row.original._id, e.target.value as Role))}
          className="h-8 border border-ink bg-paper px-1 text-xs"
          aria-label={`Role for ${row.original.email}`}
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      ),
    },
    { accessorKey: "orders", header: "Orders" },
    { accessorKey: "spent", header: "Spent", cell: ({ getValue }) => <span className="font-mono">{formatINR(getValue() as number)}</span> },
    { accessorKey: "createdAt", header: "Joined", cell: ({ getValue }) => <span className="text-xs">{formatDate(getValue() as string)}</span> },
    { accessorKey: "isBlocked", header: "State", cell: ({ getValue }) => (getValue() ? <Badge tone="oxide">Blocked</Badge> : <Badge tone="moss">Active</Badge>) },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex gap-2 text-xs">
          <a className="underline" href={`/admin/orders?q=${encodeURIComponent(row.original.email)}`}>
            Orders
          </a>
          {row.original._id !== selfId ? (
            <button className="underline" onClick={() => run(() => setUserBlocked(row.original._id, !row.original.isBlocked))}>
              {row.original.isBlocked ? "Unblock" : "Block"}
            </button>
          ) : null}
          <button className="underline" onClick={() => run(() => adminSendPasswordReset(row.original._id))}>
            Reset password
          </button>
        </span>
      ),
    },
  ];
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search name or email…" />;
}

/* ───────── Reviews ───────── */
export function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const { pending, run } = useAction();
  return (
    <span className="flex gap-2">
      {!approved ? (
        <Button size="sm" variant="signal" loading={pending} onClick={() => run(() => moderateReview(id, "approve"))}>
          Approve
        </Button>
      ) : (
        <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => moderateReview(id, "reject"))}>
          Unpublish
        </Button>
      )}
      <Button size="sm" variant="ghost" loading={pending} onClick={() => window.confirm("Delete review?") && run(() => moderateReview(id, "delete"))}>
        Delete
      </Button>
    </span>
  );
}

/* ───────── Coupons ───────── */
export function CouponForm({ initial, id, trigger }: { initial?: CouponInput; id?: string; trigger: ReactNode }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const form = useForm<CouponInput>({
    defaultValues: initial ?? { code: "", description: "", type: "percent", value: 10, minOrder: 0, maxUses: 0, perUserLimit: 1, startsAt: "", expiresAt: "", isActive: true },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={id ? "Edit coupon" : "New coupon"}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => run(() => saveCoupon(v, id), () => setOpen(false)))}>
          <Field label="Code" htmlFor="cp-code">
            <Input id="cp-code" className="font-mono uppercase" {...form.register("code")} />
          </Field>
          <Field label="Type" htmlFor="cp-type">
            <Select id="cp-type" {...form.register("type")}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </Select>
          </Field>
          <Field label="Value" htmlFor="cp-val">
            <Input id="cp-val" type="number" {...form.register("value")} />
          </Field>
          <Field label="Min order (₹)" htmlFor="cp-min">
            <Input id="cp-min" type="number" {...form.register("minOrder")} />
          </Field>
          <Field label="Max uses (0 = unlimited)" htmlFor="cp-max">
            <Input id="cp-max" type="number" {...form.register("maxUses")} />
          </Field>
          <Field label="Per-user limit (0 = unlimited)" htmlFor="cp-pu">
            <Input id="cp-pu" type="number" {...form.register("perUserLimit")} />
          </Field>
          <Field label="Starts" htmlFor="cp-start">
            <Input id="cp-start" type="date" {...form.register("startsAt")} />
          </Field>
          <Field label="Expires" htmlFor="cp-exp">
            <Input id="cp-exp" type="date" {...form.register("expiresAt")} />
          </Field>
          <Field label="Description" htmlFor="cp-desc" className="sm:col-span-2">
            <Input id="cp-desc" {...form.register("description")} />
          </Field>
          <Checkbox id="cp-active" {...form.register("isActive")} label="Active" />
          <Button type="submit" loading={pending} className="sm:col-span-2">
            Save coupon
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCouponButton({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <Button size="sm" variant="ghost" loading={pending} onClick={() => window.confirm("Delete coupon?") && run(() => deleteCoupon(id))}>
      Delete
    </Button>
  );
}

/* ───────── Material Wanted ───────── */
export function MatchRequestForm({ id, status }: { id: string; status: string }) {
  const { pending, run } = useAction();
  const [lots, setLots] = useState("");
  const [note, setNote] = useState("");
  if (status === "closed") return <StatusBadge status="closed" />;
  return (
    <div className="space-y-2">
      <Input value={lots} onChange={(e) => setLots(e.target.value)} placeholder="Lot numbers: A-0012, A-0031" className="font-mono text-xs" aria-label="Matching lot numbers" />
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to buyer (optional)" aria-label="Note" />
      <div className="flex gap-2">
        <Button size="sm" variant="signal" loading={pending} onClick={() => run(() => matchRequest(id, lots, note))}>
          Match & notify
        </Button>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => closeRequest(id))}>
          Close
        </Button>
      </div>
    </div>
  );
}

/* ───────── Inventory ───────── */
export function StockAdjuster({ id, qty }: { id: string; qty: number }) {
  const { pending, run } = useAction();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className="w-10 font-mono">{qty}</span>
      <input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="±qty" className="h-8 w-16 border border-ink bg-paper px-1 font-mono text-xs" aria-label="Adjustment" />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason" className="h-8 w-32 border border-ink bg-paper px-1 text-xs" aria-label="Reason" />
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        onClick={() =>
          run(
            () => adjustStock(id, Number(delta), reason),
            () => {
              setDelta("");
              setReason("");
            },
          )
        }
      >
        Apply
      </Button>
    </span>
  );
}
