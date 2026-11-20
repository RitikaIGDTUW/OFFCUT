"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { validateCart } from "@/actions/cart";
import { getQuote } from "@/actions/checkout";
import { computeTotals, deliveryEstimate, type ShippingRules } from "@/lib/pricing";
import { QtyStepper } from "./cart-drawer";
import { Totals } from "./checkout-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { formatINR } from "@/lib/utils";

export function CartView({ shipping, taxRate }: { shipping: ShippingRules; taxRate: number }) {
  const { status } = useSession();
  const { items, remove, replace } = useCart();
  const [mounted, setMounted] = useState(false);
  const [pincode, setPincode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [serverQuote, setServerQuote] = useState<Parameters<typeof Totals>[0]["quote"]>(null);
  useEffect(() => setMounted(true), []);

  // Stock validation: re-check every line against MongoDB when the page opens.
  useEffect(() => {
    if (!mounted || !items.length) return;
    const before = useCart.getState().items;
    void validateCart(before.map((i) => ({ productId: i.productId, qty: i.qty }))).then((fresh) => {
      const changed = fresh.length !== before.length || fresh.some((f) => {
        const b = before.find((x) => x.productId === f.productId);
        return !b || b.qty !== f.qty || b.price !== f.price;
      });
      if (changed) {
        replace(fresh);
        toast("Some lots changed price or stock — your cart was updated.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;
  if (!items.length)
    return (
      <EmptyState code="0000" title="Your cart is empty." action={<Button asChild variant="signal"><Link href="/shop">Browse lots</Link></Button>}>
        Off-cuts move fast — new lots land every Friday.
      </EmptyState>
    );

  const local = computeTotals(items, shipping, taxRate, null, "standard");
  const est = deliveryEstimate(pincode);

  const applyCoupon = async () => {
    if (status !== "authenticated") return toast.error("Sign in to apply a coupon.");
    const r = await getQuote(items.map((i) => ({ productId: i.productId, qty: i.qty })), coupon, "standard");
    if (r.ok) {
      setServerQuote(r.data);
      toast.success("Coupon applied — it will carry to checkout if you enter it there.");
    } else toast.error(r.error);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="mb-6 text-5xl leading-none">Cart</h1>
        <ul className="divide-y divide-rule border-y border-ink">
          {items.map((i) => (
            <li key={i.productId} className="grid grid-cols-[96px_1fr] gap-4 py-5 sm:grid-cols-[120px_1fr_auto]">
              <Link href={`/lot/${i.slug}`} className="relative aspect-square border border-ink">
                {i.image ? <SafeImage src={i.image} alt={i.title} fill sizes="120px" className="object-cover" /> : null}
              </Link>
              <div className="min-w-0">
                <p className="spec text-[10px] text-graphite">LOT #{i.lotNumber}</p>
                <Link href={`/lot/${i.slug}`} className="text-lg font-medium hover:underline">
                  {i.title}
                </Link>
                <p className="spec mt-1 text-[10px] text-graphite">{i.specs}</p>
                <p className="mt-1 text-xs text-graphite">
                  {formatINR(i.price)} / {i.sellByWeight ? "kg" : i.unitType} · {i.max} in stock
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <QtyStepper item={i} />
                  <button onClick={() => remove(i.productId)} className="flex items-center gap-1 text-xs text-graphite hover:text-oxide">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
              <p className="col-start-2 font-mono text-lg sm:col-start-3 sm:text-right">{formatINR(i.price * i.qty)}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit space-y-5 border border-ink p-5 lg:sticky lg:top-28">
        <div>
          <label htmlFor="pin" className="spec mb-1 block text-[10px] text-graphite">
            Estimate delivery
          </label>
          <Input id="pin" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="PIN code" />
          {est ? (
            <p className="mt-2 text-xs">
              {est.zone}: ~{est.days} working days (standard). Shipping {local.shipping ? formatINR(local.shipping) : "free"}.
            </p>
          ) : pincode.length === 6 ? (
            <p className="mt-2 text-xs text-oxide">We don&apos;t recognise that PIN code.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="cart-coupon" className="spec mb-1 block text-[10px] text-graphite">
            Coupon
          </label>
          <div className="flex">
            <Input id="cart-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="MAKER10" className="font-mono" />
            <Button variant="outline" className="-ml-px" onClick={applyCoupon}>
              Apply
            </Button>
          </div>
        </div>
        <Totals quote={serverQuote ?? { ...local, taxRate, coupon: null }} />
        <Button asChild variant="signal" size="lg" className="w-full">
          <Link href="/checkout">Checkout →</Link>
        </Button>
        <p className="text-center text-xs text-graphite">Prices & stock are re-checked on the server at checkout.</p>
      </aside>
    </div>
  );
}
