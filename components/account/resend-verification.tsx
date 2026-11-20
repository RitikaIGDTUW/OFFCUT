"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { resendVerification } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function ResendVerification() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await resendVerification();
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      Resend email
    </Button>
  );
}
