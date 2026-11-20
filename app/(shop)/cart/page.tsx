import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <CartView shipping={s.shipping} taxRate={s.taxRate} />
    </div>
  );
}
