"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestCancelOrReturn } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Textarea, Field } from "@/components/ui/form";

export function OrderRequestButtons({ orderNumber, canCancel, canReturn, pendingNote }: { orderNumber: string; canCancel: boolean; canReturn: boolean; pendingNote?: string }) {
  if (pendingNote) return <p className="border border-rule p-3 text-xs text-graphite">{pendingNote}</p>;
  return (
    <div className="space-y-2">
      {canCancel ? <RequestDialog orderNumber={orderNumber} kind="cancel" /> : null}
      {canReturn ? <RequestDialog orderNumber={orderNumber} kind="return" /> : null}
    </div>
  );
}

function RequestDialog({ orderNumber, kind }: { orderNumber: string; kind: "cancel" | "return" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {kind === "cancel" ? "Request cancellation" : "Request return"}
        </Button>
      </DialogTrigger>
      <DialogContent title={kind === "cancel" ? "Cancel order" : "Return order"} description={kind === "return" ? "Returns are accepted within 7 days of delivery." : "Orders can be cancelled before they are packed."}>
        <Field label="Reason" htmlFor="reason">
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          className="mt-4"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await requestCancelOrReturn(orderNumber, kind, reason);
              if (r.ok) {
                toast.success(r.message);
                setOpen(false);
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Submit request
        </Button>
      </DialogContent>
    </Dialog>
  );
}
