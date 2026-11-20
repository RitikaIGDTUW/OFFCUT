"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Menu, Moon, Search, ShoppingBag, Sun, User } from "lucide-react";
import { useCart } from "@/store/cart";
import { useTheme } from "@/components/providers";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import type { Role } from "@/lib/constants";

export function HeaderActions({ user }: { user: { name: string; role: Role } | null }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const count = useCart((s) => s.items.length);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const iconBtn = "grid h-9 w-9 place-items-center border border-transparent hover:border-ink";
  return (
    <div className="ml-auto flex items-center gap-1">
      <form
        role="search"
        className="mr-2 hidden items-center border border-ink md:flex"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          if (q) router.push(`/search?q=${encodeURIComponent(String(q))}`);
        }}
      >
        <label htmlFor="header-search" className="sr-only">
          Search lots
        </label>
        <input
          id="header-search"
          name="q"
          placeholder="Material, grade or size…"
          className="h-9 w-44 bg-transparent px-3 text-sm placeholder:text-graphite/70 focus:outline-none xl:w-60"
        />
        <button className="grid h-9 w-9 place-items-center border-l border-ink hover:bg-ink hover:text-paper" aria-label="Search">
          <Search size={15} />
        </button>
      </form>
      <Link href="/search" className={`${iconBtn} md:hidden`} aria-label="Search">
        <Search size={17} />
      </Link>
      <button onClick={toggle} className={iconBtn} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
        {mounted && theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {user ? (
        <Dropdown.Root>
          <Dropdown.Trigger className={iconBtn} aria-label="Account menu">
            <User size={17} />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content align="end" sideOffset={6} className="z-50 min-w-[200px] border border-ink bg-paper p-1 shadow-stamp-sm">
              <p className="spec border-b border-rule px-3 py-2 text-[10px] text-graphite">
                {user.name} · {user.role}
              </p>
              {[
                ["/account", "My account"],
                ["/account/orders", "Orders"],
                ["/account/wishlist", "Wishlist"],
                ...(user.role === "supplier" || user.role === "admin" ? [["/supplier", "Supplier portal"]] : []),
                ...(user.role === "admin" ? [["/admin", "Admin panel"]] : []),
              ].map(([href, label]) => (
                <Dropdown.Item key={href} asChild>
                  <Link href={href} className="block px-3 py-2 text-sm outline-none data-[highlighted]:bg-paper-2">
                    {label}
                  </Link>
                </Dropdown.Item>
              ))}
              <Dropdown.Separator className="my-1 h-px bg-rule" />
              <Dropdown.Item
                onSelect={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer px-3 py-2 text-sm outline-none data-[highlighted]:bg-paper-2"
              >
                Sign out
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ) : (
        <Link href="/login" className="spec ml-1 hidden text-[11px] hover:underline sm:block">
          Sign in
        </Link>
      )}

      <button
        onClick={() => setOpen(true)}
        className="relative ml-1 flex h-9 items-center gap-2 border border-ink bg-ink px-3 text-paper hover:bg-signal hover:text-signal-ink"
        aria-label={`Open cart, ${mounted ? count : 0} lots`}
      >
        <ShoppingBag size={15} />
        <span className="font-mono text-xs">{mounted ? count : 0}</span>
      </button>
    </div>
  );
}

export function MobileNav({ nav, categories }: { nav: { href: string; label: string }[]; categories: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="grid h-9 w-9 place-items-center border border-ink lg:hidden" aria-label="Open menu">
        <Menu size={17} />
      </DialogTrigger>
      <DialogContent title="Menu" side="left">
        <nav className="space-y-6" aria-label="Mobile">
          <ul className="space-y-3">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="font-display text-3xl">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <p className="spec mb-2 text-[10px] text-graphite">Categories</p>
            <ul className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop/${c.slug}`} onClick={() => setOpen(false)} className="text-sm underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/account" onClick={() => setOpen(false)} className="spec block border-t border-ink pt-4 text-xs">
            Account →
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
