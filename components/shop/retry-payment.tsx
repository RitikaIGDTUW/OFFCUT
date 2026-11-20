"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { retryPayment, verifyPayment, reportPaymentFailure } from "@/actions/checkout";
import { openRazorpay } from "@/lib/razorpay-client";
import { Button } from "@/components/ui/button";

/** "Retry payment" for an order whose Razorpay payment was dismissed or failed. */
export function RetryPayment({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="signal"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await retryPayment(orderNumber);
          if (!r.ok || !r.data?.razorpay) return void toast.error(r.ok ? "Could not start payment" : r.error);
          const res = await openRazorpay(r.data.razorpay, (reason) => {
            toast.error(`Payment failed: ${reason}`);
            void reportPaymentFailure(orderNumber, reason);
          });
          if (!res) return;
          const v = await verifyPayment({ orderNumber, ...res });
          if (v.ok) toast.success("Payment verified — thank you!");
          else toast.error(v.error);
          router.refresh();
        })
      }
    >
      Retry payment
    </Button>
  );
}
