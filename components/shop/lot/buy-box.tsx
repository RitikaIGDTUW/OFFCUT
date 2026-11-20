"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/store/cart";
import { toggleWishlist } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";

/** Quantity selector (capped by stock), Add to cart, Buy now, Wishlist + sticky mobile bar. */
export function BuyBox({ item, inWishlist }: { item: Omit<CartItem, "qty">; inWishlist: boolean }) {
  const router = useRouter();
  const { status } = useSession();
  const add = useCart((s) => s.add);
  const step = item.sellByWeight ? 0.5 : 1;
  const [qty, setQty] = useState(Math.min(step, item.max));
  const [wish, setWish] = useState(inWishlist);
  const [pending, start] = useTransition();
  const soldOut = item.max <= 0;
  const clamp = (q: number) => Math.max(step, Math.min(item.max, Math.round(q / step) * step));

  const addToCart = (goCheckout = false) => {
    add({ ...item, qty });
    if (goCheckout) {
      useCart.getState().setOpen(false);
      router.push("/checkout");
    } else toast.success("Added to cart");
  };

  const wishlist = () => {
    if (status !== "authenticated") return router.push(`/login?callbackUrl=/lot/${item.slug}`);
    start(async () => {
      const r = await toggleWishlist(item.productId);
      if (r.ok) {
        setWish(Boolean(r.data));
        toast.success(r.data ? "Saved to wishlist" : "Removed from wishlist");
      } else toast.error(r.error);
    });
  };

  const unit = item.sellByWeight ? "kg" : item.unitType;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center border border-ink">
            <button className="grid h-12 w-12 place-items-center hover:bg-paper-2 disabled:opacity-40" onClick={() => setQty((q) => clamp(q - step))} disabled={soldOut || qty <= step} aria-label="Decrease quantity">
              <Minus size={14} />
            </button>
            <label htmlFor="qty" className="sr-only">
              Quantity
            </label>
            <input
              id="qty"
              inputMode="decimal"
              value={qty}
              disabled={soldOut}
              onChange={(e) => setQty(Number(e.target.value) || step)}
              onBlur={() => setQty((q) => clamp(q))}
              className="h-12 w-16 border-x border-ink bg-paper text-center font-mono"
            />
            <button className="grid h-12 w-12 place-items-center hover:bg-paper-2 disabled:opacity-40" onClick={() => setQty((q) => clamp(q + step))} disabled={soldOut || qty >= item.max} aria-label="Increase quantity">
              <Plus size={14} />
            </button>
          </div>
          <p className="spec text-[11px] text-graphite">
            {soldOut ? "Sold out" : `${item.max} ${unit}${item.max === 1 ? "" : "s"} available`}
          </p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Button variant="signal" size="lg" disabled={soldOut} onClick={() => addToCart(false)}>
            Add to cart
          </Button>
          <Button variant="ink" size="lg" disabled={soldOut} onClick={() => addToCart(true)}>
            Buy now
          </Button>
          <Button variant="outline" size="lg" className="w-12 px-0" onClick={wishlist} loading={pending} aria-pressed={wish} aria-label={wish ? "Remove from wishlist" : "Save to wishlist"}>
            <Heart size={16} className={cn(wish && "fill-signal text-signal")} />
          </Button>
        </div>
      </div>

      {/* Sticky bottom bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink bg-paper px-4 py-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-graphite">LOT #{item.lotNumber}</p>
          <p className="font-mono text-lg leading-none">
            {formatINR(item.price * qty)} <span className="text-xs text-graphite">· {qty} {unit}</span>
          </p>
        </div>
        <Button variant="signal" disabled={soldOut} onClick={() => addToCart(false)}>
          Add to cart
        </Button>
      </div>
    </>
  );
}
