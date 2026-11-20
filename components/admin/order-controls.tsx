"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { refundOrder, setTracking, updateOrderStatus } from "@/actions/admin/commerce";
import { ORDER_STATUS, type OrderStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function OrderAdminControls({ id, status, courier, tracking, canRefund }: { id: string; status: string; courier: string; tracking: string; canRefund: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [next, setNext] = useState<OrderStatus>(status as OrderStatus);
  const [note, setNote] = useState("");
  const [c, setC] = useState(courier);
  const [t, setT] = useState(tracking);
  const done = (r: { ok: boolean; message?: string; error?: string }) => {
    if (r.ok) toast.success(r.message ?? "Saved");
    else toast.error(r.error);
    router.refresh();
  };
  return (
    <div className="space-y-4">
      <div className="space-y-3 border border-ink p-4">
        <p className="spec text-[10px] text-graphite">Update status (emails the customer)</p>
        <Select value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} aria-label="New status">
          {ORDER_STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the customer (optional)" aria-label="Note" rows={2} />
        <Button className="w-full" loading={pending} onClick={() => start(async () => done(await updateOrderStatus(id, next, note)))}>
          Update status
        </Button>
      </div>
      <div className="space-y-3 border border-ink p-4">
        <p className="spec text-[10px] text-graphite">Tracking</p>
        <Field label="Courier" htmlFor="o-courier">
          <Input id="o-courier" value={c} onChange={(e) => setC(e.target.value)} placeholder="Delhivery" />
        </Field>
        <Field label="Tracking number" htmlFor="o-track">
          <Input id="o-track" value={t} onChange={(e) => setT(e.target.value)} className="font-mono" />
        </Field>
        <Button variant="outline" className="w-full" loading={pending} onClick={() => start(async () => done(await setTracking(id, c, t)))}>
          Save tracking & mark shipped
        </Button>
      </div>
      {canRefund ? (
        <Button
          variant="danger"
          className="w-full"
          loading={pending}
          onClick={() => {
            if (window.confirm("Issue a FULL refund for this order? Stock will be restored.")) start(async () => done(await refundOrder(id)));
          }}
        >
          Issue full refund
        </Button>
      ) : null}
    </div>
  );
}
