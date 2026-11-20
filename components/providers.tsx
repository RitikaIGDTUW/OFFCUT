"use client";
import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import type { PublicFeatures } from "@/lib/env";
import { CartSync } from "@/components/shop/cart-sync";

/** Feature flags from the server (is UploadThing / Razorpay / Google configured?). */
const FeaturesContext = createContext<PublicFeatures>({ uploads: false, razorpay: false, google: false });
export const useFeatures = () => useContext(FeaturesContext);

/* ───────── Light / dark theme (class on <html>, remembered in localStorage) ───────── */
type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("offcut-theme");
    } catch {}
    const initial: Theme = saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initial);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("offcut-theme", next);
      } catch {}
      return next;
    });
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function Providers({ children, features }: { children: ReactNode; features: PublicFeatures }) {
  return (
    <SessionProvider>
      <FeaturesContext.Provider value={features}>
        <ThemeProvider>
          {children}
          <CartSync />
          <Toaster
            position="bottom-right"
            toastOptions={{
              unstyled: false,
              className: "!rounded-none !border !border-ink !bg-paper !text-ink !font-sans !shadow-stamp-sm",
            }}
          />
        </ThemeProvider>
      </FeaturesContext.Provider>
    </SessionProvider>
  );
}
