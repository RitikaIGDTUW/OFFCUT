"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/store/cart";
import { syncCart } from "@/actions/cart";

/**
 * Invisible component that keeps the Zustand cart and MongoDB in step:
 *  - on login: merge the guest cart into the saved cart (once per session)
 *  - afterwards: save every change (debounced 600 ms)
 */
export function CartSync() {
  const { status } = useSession();
  const merged = useRef(false);
  const version = useCart((s) => s.version);

  useEffect(() => {
    if (status !== "authenticated" || merged.current) return;
    merged.current = true;
    const lines = useCart.getState().items.map((i) => ({ productId: i.productId, qty: i.qty }));
    void syncCart(lines, true).then((items) => items && useCart.getState().replace(items));
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") merged.current = false;
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !merged.current || version === 0) return;
    const t = setTimeout(() => {
      const lines = useCart.getState().items.map((i) => ({ productId: i.productId, qty: i.qty }));
      void syncCart(lines, false);
    }, 600);
    return () => clearTimeout(t);
  }, [version, status]);

  return null;
}
