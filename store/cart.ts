"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** One cart line as shown in the UI. Prices here are a preview — the server re-prices at checkout. */
export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  lotNumber: string;
  image?: string;
  price: number;
  qty: number;
  max: number; // stock available
  unitType: string;
  sellByWeight: boolean;
  weightKg: number;
  specs: string;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  /** bumps on every user change so CartSync knows to save to MongoDB */
  version: number;
  setOpen: (o: boolean) => void;
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void; // from server (no version bump)
};

const clampQty = (qty: number, item: Pick<CartItem, "max" | "sellByWeight">) => {
  const step = item.sellByWeight ? 0.5 : 1;
  const q = Math.round(qty / step) * step;
  return Math.max(step, Math.min(q, item.max));
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      version: 0,
      setOpen: (open) => set({ open }),
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          const items = existing
            ? s.items.map((i) => (i.productId === item.productId ? { ...i, ...item, qty: clampQty(i.qty + item.qty, item) } : i))
            : [...s.items, { ...item, qty: clampQty(item.qty, item) }];
          return { items, open: true, version: s.version + 1 };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, qty: clampQty(qty, i) } : i)),
          version: s.version + 1,
        })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId), version: s.version + 1 })),
      clear: () => set((s) => ({ items: [], version: s.version + 1 })),
      replace: (items) => set({ items }),
    }),
    {
      name: "offcut-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.length;
export const cartSubtotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
