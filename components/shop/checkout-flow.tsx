"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useCart } from "@/store/cart";
import { addressSchema, type AddressInput } from "@/lib/validations/common";
import { getQuote, placeOrder, reportPaymentFailure, verifyPayment } from "@/actions/checkout";
import { openRazorpay } from "@/lib/razorpay-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Checkbox } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { cn, formatINR } from "@/lib/utils";

type SavedAddress = AddressInput & { _id: string };
type Quote = { subtotal: number; discount: number; shipping: number; tax: number; total: number; totalKg: number; taxRate: number; coupon: { code: string } | null };
const STEPS = ["Address", "Shipping", "Payment", "Review"] as const;

export function CheckoutFlow(props: {
  addresses: SavedAddress[];
  defaultName: string;
  defaultPhone: string;
  codEnabled: boolean;
  razorpayEnabled: boolean;
  testMode: boolean;
  expressSurcharge: number;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<AddressInput | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<"razorpay" | "cod">(props.razorpayEnabled ? "razorpay" : "cod");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  useEffect(() => setMounted(true), []);

  const lines = items.map((i) => ({ productId: i.productId, qty: i.qty }));
  const linesKey = JSON.stringify(lines);

  // Server-side quote: prices, stock, coupon, shipping and GST are always computed by the server.
  const refreshQuote = useCallback(
    async (code: string) => {
      const r = await getQuote(JSON.parse(linesKey), code, method);
      if (r.ok) {
        setQuote(r.data);
        setQuoteError(null);
        return true;
      }
      setQuoteError(r.error);
      return false;
    },
    [linesKey, method],
  );
  useEffect(() => {
    if (mounted && items.length) void refreshQuote(appliedCoupon);
  }, [mounted, refreshQuote, appliedCoupon, items.length]);

  const finish = (orderNumber: string) => {
    useCart.getState().clear();
    router.push(`/order/${orderNumber}`);
  };

  const place = () =>
    startPlacing(async () => {
      if (!address) return;
      const r = await placeOrder({ items: lines, address, saveAddress, shippingMethod: method, paymentMethod: payment, couponCode: appliedCoupon });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const { orderNumber, razorpay } = r.data!;
      if (!razorpay) return finish(orderNumber);
      const res = await openRazorpay(razorpay, (reason) => {
        toast.error(`Payment failed: ${reason}`);
        void reportPaymentFailure(orderNumber, reason);
      });
      if (!res) {
        // Closed or failed: the order stays pending and stock is held for 30 min — retry from the order page.
        useCart.getState().clear();
        toast("Payment not completed — you can retry from your order page.");
        router.push(`/order/${orderNumber}`);
        return;
      }
      const v = await verifyPayment({ orderNumber, ...res });
      if (v.ok) {
        toast.success("Payment verified");
        finish(orderNumber);
      } else {
        toast.error(v.error);
        router.push(`/order/${orderNumber}`);
      }
    });

  if (!mounted) return null;
  if (!items.length)
    return (
      <EmptyState title="Your cart is empty." action={<Button asChild variant="signal"><Link href="/shop">Browse lots</Link></Button>} />
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-5xl leading-none">Checkout</h1>
          {props.testMode ? <Badge tone="signal">Razorpay TEST MODE — no real money</Badge> : null}
        </div>
        <ol className="mb-8 grid grid-cols-4 border border-ink" aria-label="Checkout steps">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("spec flex items-center gap-2 border-ink px-3 py-2 text-[10px]", i > 0 && "border-l", i === step && "bg-ink text-paper", i < step && "bg-paper-2")} aria-current={i === step ? "step" : undefined}>
              <span className="font-bold">{i < step ? <Check size={12} /> : `0${i + 1}`}</span>
              <span className="hidden sm:inline">{s}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <AddressStep
            addresses={props.addresses}
            defaultName={props.defaultName}
            defaultPhone={props.defaultPhone}
            saveAddress={saveAddress}
            setSaveAddress={setSaveAddress}
            onNext={(a) => {
              setAddress(a);
              setStep(1);
            }}
          />
        ) : null}

        {step === 1 ? (
          <section className="space-y-3">
            {(
              [
                ["standard", "Standard courier", "3–6 working days", 0],
                ["express", "Express", "1–3 working days", props.expressSurcharge],
              ] as const
            ).map(([k, t, d, extra]) => (
              <label key={k} className={cn("flex cursor-pointer items-center gap-4 border p-4", method === k ? "border-ink bg-paper-2" : "border-rule")}>
                <input type="radio" name="ship" checked={method === k} onChange={() => setMethod(k)} className="accent-[#183D35]" />
                <span className="flex-1">
                  <span className="block font-medium">{t}</span>
                  <span className="text-sm text-graphite">{d}</span>
                </span>
                <span className="font-mono text-sm">{extra ? `+${formatINR(extra)}` : "Base rate"}</span>
              </label>
            ))}
            <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3">
            <label className={cn("flex items-center gap-4 border p-4", !props.razorpayEnabled && "opacity-50", payment === "razorpay" ? "border-ink bg-paper-2" : "border-rule")}>
              <input type="radio" name="pay" disabled={!props.razorpayEnabled} checked={payment === "razorpay"} onChange={() => setPayment("razorpay")} className="accent-[#183D35]" />
              <span className="flex-1">
                <span className="block font-medium">Pay online — Razorpay</span>
                <span className="text-sm text-graphite">
                  {props.razorpayEnabled ? "Cards, UPI, netbanking. Test: card 4111 1111 1111 1111 or UPI success@razorpay." : "Not configured (add Razorpay test keys to .env.local)."}
                </span>
              </span>
            </label>
            <label className={cn("flex items-center gap-4 border p-4", !props.codEnabled && "opacity-50", payment === "cod" ? "border-ink bg-paper-2" : "border-rule")}>
              <input type="radio" name="pay" disabled={!props.codEnabled} checked={payment === "cod"} onChange={() => setPayment("cod")} className="accent-[#183D35]" />
              <span className="flex-1">
                <span className="block font-medium">Cash on Delivery</span>
                <span className="text-sm text-graphite">{props.codEnabled ? "Pay the courier when your lot arrives." : "Disabled by the store."}</span>
              </span>
            </label>
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={(payment === "cod" && !props.codEnabled) || (payment === "razorpay" && !props.razorpayEnabled)} />
          </section>
        ) : null}

        {step === 3 && address ? (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Summary title="Ship to" onEdit={() => setStep(0)}>
                {address.fullName}
                <br />
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                {address.phone}
              </Summary>
              <Summary title="Shipping" onEdit={() => setStep(1)}>
                {method === "express" ? "Express (1–3 days)" : "Standard (3–6 days)"}
              </Summary>
              <Summary title="Payment" onEdit={() => setStep(2)}>
                {payment === "cod" ? "Cash on Delivery" : "Razorpay (test mode)"}
              </Summary>
            </div>
            <ul className="divide-y divide-rule border-y border-ink">
              {items.map((i) => (
                <li key={i.productId} className="flex gap-3 py-3">
                  <span className="relative h-16 w-16 shrink-0 border border-ink">{i.image ? <SafeImage src={i.image} alt="" fill sizes="64px" className="object-cover" /> : null}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="spec block text-[10px] text-graphite">LOT #{i.lotNumber}</span>
                    {i.title}
                    <span className="block font-mono text-xs text-graphite">
                      {i.qty} × {formatINR(i.price)}
                    </span>
                  </span>
                  <span className="font-mono text-sm">{formatINR(i.qty * i.price)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button variant="signal" size="lg" loading={placing} disabled={!quote || !!quoteError} onClick={place} className="flex-1">
                {payment === "cod" ? `Place order · ${quote ? formatINR(quote.total) : ""}` : `Pay ${quote ? formatINR(quote.total) : ""} with Razorpay`}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Totals sidebar */}
      <aside className="h-fit border border-ink p-5 lg:sticky lg:top-28">
        <p className="spec text-xs">Order summary</p>
        <form
          className="mt-4 flex"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await refreshQuote(coupon.trim());
            if (ok) {
              setAppliedCoupon(coupon.trim().toUpperCase());
              if (coupon.trim()) toast.success("Coupon applied");
            }
          }}
        >
          <label htmlFor="coupon" className="sr-only">
            Coupon code
          </label>
          <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="COUPON" className="font-mono uppercase" />
          <Button variant="outline" className="-ml-px">
            Apply
          </Button>
        </form>
        {quoteError ? <p className="mt-2 text-xs text-oxide" role="alert">{quoteError}</p> : null}
        <Totals quote={quote} />
      </aside>
    </div>
  );
}

export function Totals({ quote }: { quote: Quote | null }) {
  if (!quote) return <p className="mt-6 text-sm text-graphite">Calculating…</p>;
  const row = (k: string, v: string, cls?: string) => (
    <div className={cn("flex justify-between py-1.5", cls)}>
      <dt>{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
  return (
    <dl className="mt-6 text-sm">
      {row("Subtotal", formatINR(quote.subtotal))}
      {quote.discount ? row(`Discount${quote.coupon ? ` (${quote.coupon.code})` : ""}`, `−${formatINR(quote.discount)}`, "text-moss") : null}
      {row("Shipping", quote.shipping ? formatINR(quote.shipping) : "Free")}
      {row(`GST (${quote.taxRate}%)`, formatINR(quote.tax))}
      <div className="mt-2 flex justify-between border-t border-ink pt-3 text-base">
        <dt className="spec">Total</dt>
        <dd className="font-mono text-xl">{formatINR(quote.total)}</dd>
      </div>
      <p className="spec mt-3 text-[10px] text-moss">♻ Diverts {quote.totalKg.toFixed(1)} kg from landfill</p>
    </dl>
  );
}

function Nav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-4">
      <Button variant="outline" onClick={onBack}>
        ← Back
      </Button>
      <Button onClick={onNext} disabled={nextDisabled}>
        Continue →
      </Button>
    </div>
  );
}

function Summary({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="border border-ink p-4 text-sm">
      <div className="mb-2 flex justify-between">
        <p className="spec text-[10px] text-graphite">{title}</p>
        <button onClick={onEdit} className="spec text-[10px] underline">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function AddressStep({
  addresses,
  defaultName,
  defaultPhone,
  saveAddress,
  setSaveAddress,
  onNext,
}: {
  addresses: SavedAddress[];
  defaultName: string;
  defaultPhone: string;
  saveAddress: boolean;
  setSaveAddress: (b: boolean) => void;
  onNext: (a: AddressInput) => void;
}) {
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [choice, setChoice] = useState<string>(def?._id ?? "new");
  const form = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: "Home", fullName: defaultName, phone: defaultPhone, line1: "", line2: "", city: "", state: "", pincode: "", country: "India", isDefault: false },
  });
  const e = form.formState.errors;

  return (
    <section className="space-y-4">
      {addresses.map((a) => (
        <label key={a._id} className={cn("flex cursor-pointer gap-4 border p-4", choice === a._id ? "border-ink bg-paper-2" : "border-rule")}>
          <input type="radio" name="addr" checked={choice === a._id} onChange={() => setChoice(a._id)} className="mt-1 accent-[#183D35]" />
          <span className="text-sm">
            <span className="spec mr-2 text-[10px]">{a.label}</span>
            <strong>{a.fullName}</strong> · {a.phone}
            <br />
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
          </span>
        </label>
      ))}
      {addresses.length ? (
        <label className={cn("flex cursor-pointer gap-4 border p-4", choice === "new" ? "border-ink bg-paper-2" : "border-rule")}>
          <input type="radio" name="addr" checked={choice === "new"} onChange={() => setChoice("new")} className="accent-[#183D35]" />
          <span className="text-sm font-medium">Use a new address</span>
        </label>
      ) : null}

      {choice === "new" ? (
        <form id="addr-form" className="grid gap-4 border border-ink p-5 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => onNext(v))}>
          <Field label="Full name" htmlFor="a-name" error={e.fullName?.message}>
            <Input id="a-name" autoComplete="name" {...form.register("fullName")} aria-invalid={!!e.fullName} />
          </Field>
          <Field label="Phone" htmlFor="a-phone" error={e.phone?.message}>
            <Input id="a-phone" autoComplete="tel" {...form.register("phone")} aria-invalid={!!e.phone} />
          </Field>
          <Field label="Address line 1" htmlFor="a-l1" error={e.line1?.message} className="sm:col-span-2">
            <Input id="a-l1" autoComplete="address-line1" {...form.register("line1")} aria-invalid={!!e.line1} />
          </Field>
          <Field label="Address line 2 (optional)" htmlFor="a-l2" className="sm:col-span-2">
            <Input id="a-l2" autoComplete="address-line2" {...form.register("line2")} />
          </Field>
          <Field label="City" htmlFor="a-city" error={e.city?.message}>
            <Input id="a-city" autoComplete="address-level2" {...form.register("city")} aria-invalid={!!e.city} />
          </Field>
          <Field label="State" htmlFor="a-state" error={e.state?.message}>
            <Input id="a-state" autoComplete="address-level1" {...form.register("state")} aria-invalid={!!e.state} />
          </Field>
          <Field label="PIN code" htmlFor="a-pin" error={e.pincode?.message}>
            <Input id="a-pin" inputMode="numeric" autoComplete="postal-code" {...form.register("pincode")} aria-invalid={!!e.pincode} />
          </Field>
          <Field label="Label" htmlFor="a-label">
            <Input id="a-label" {...form.register("label")} placeholder="Home / Studio" />
          </Field>
          <Checkbox id="save-addr" checked={saveAddress} onChange={(ev) => setSaveAddress(ev.target.checked)} label="Save this address to my account" className="sm:col-span-2" />
        </form>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href="/cart">← Cart</Link>
        </Button>
        {choice === "new" ? (
          <Button type="submit" form="addr-form">
            Continue →
          </Button>
        ) : (
          <Button
            onClick={() => {
              const a = addresses.find((x) => x._id === choice);
              if (a) {
                setSaveAddress(false);
                onNext({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode, country: a.country, isDefault: false });
              }
            }}
          >
            Continue →
          </Button>
        )}
      </div>
    </section>
  );
}
