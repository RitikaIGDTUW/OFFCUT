"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, cartSubtotal, type CartItem } from "@/store/cart";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { formatINR } from "@/lib/utils";

/** Slide-over cart from the right. */
export function CartDrawer() {
  const { items, open, setOpen } = useCart();
  const subtotal = cartSubtotal(items);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Your cart" description={`${items.length} lot${items.length === 1 ? "" : "s"}`} side="right">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-4xl italic">Nothing on the bench yet.</p>
            <Button asChild variant="outline" className="mt-6" onClick={() => setOpen(false)}>
              <Link href="/shop">Browse lots</Link>
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <ul className="flex-1 divide-y divide-rule">
              {items.map((i) => (
                <CartRow key={i.productId} item={i} />
              ))}
            </ul>
            <div className="sticky bottom-0 mt-4 border-t border-ink bg-paper pt-4">
              <div className="flex justify-between font-mono text-sm">
                <span className="spec">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-graphite">GST, shipping and coupons are calculated at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" onClick={() => setOpen(false)}>
                  <Link href="/cart">View cart</Link>
                </Button>
                <Button asChild variant="signal" onClick={() => setOpen(false)}>
                  <Link href="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function QtyStepper({ item }: { item: CartItem }) {
  const setQty = useCart((s) => s.setQty);
  const step = item.sellByWeight ? 0.5 : 1;
  return (
    <div className="inline-flex items-center border border-ink">
      <button className="grid h-8 w-8 place-items-center hover:bg-paper-2" onClick={() => setQty(item.productId, item.qty - step)} aria-label="Decrease quantity">
        <Minus size={12} />
      </button>
      <span className="w-14 text-center font-mono text-xs" aria-live="polite">
        {item.qty}
        {item.sellByWeight ? " kg" : ""}
      </span>
      <button
        className="grid h-8 w-8 place-items-center hover:bg-paper-2 disabled:opacity-40"
        onClick={() => setQty(item.productId, item.qty + step)}
        disabled={item.qty >= item.max}
        aria-label="Increase quantity"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const remove = useCart((s) => s.remove);
  return (
    <li className="flex gap-3 py-4">
      <div className="relative h-20 w-20 shrink-0 border border-ink bg-paper-2">
        {item.image ? <SafeImage src={item.image} alt={item.title} fill sizes="80px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="spec text-[10px] text-graphite">LOT #{item.lotNumber}</p>
        <Link href={`/lot/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">
          {item.title}
        </Link>
        <p className="spec mt-0.5 text-[10px] text-graphite">{item.specs}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <QtyStepper item={item} />
          <span className="font-mono text-sm">{formatINR(item.price * item.qty)}</span>
        </div>
      </div>
      <button onClick={() => remove(item.productId)} className="self-start p-1 text-graphite hover:text-oxide" aria-label={`Remove ${item.title}`}>
        <Trash2 size={15} />
      </button>
    </li>
  );
}
