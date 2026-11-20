"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  FileClock,
  FolderTree,
  Gauge,
  Menu,
  MessageSquareText,
  PackageSearch,
  Search,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  ["/admin", "Dashboard", Gauge],
  ["/admin/products", "Lots", Boxes],
  ["/admin/categories", "Categories", FolderTree],
  ["/admin/orders", "Orders", ShoppingCart],
  ["/admin/submissions", "Submissions", ClipboardList],
  ["/admin/suppliers", "Suppliers", Factory],
  ["/admin/users", "Users", Users],
  ["/admin/reviews", "Reviews", MessageSquareText],
  ["/admin/coupons", "Coupons", Ticket],
  ["/admin/requests", "Material wanted", Search],
  ["/admin/inventory", "Inventory", PackageSearch],
  ["/admin/reports", "Reports", BarChart3],
  ["/admin/audit", "Audit log", FileClock],
  ["/admin/settings", "Content & settings", Settings],
] as const;

/** Admin chrome: dark sidebar on desktop, slide-in drawer on mobile. */
export function AdminShell({ children, userName }: { children: ReactNode; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Admin">
      {NAV.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active(href) ? "page" : undefined}
          className={cn("flex items-center gap-3 px-3 py-2 text-sm", active(href) ? "bg-signal font-medium text-[#F4F0E7]" : "text-[#F4F0E7]/80 hover:bg-white/10 hover:text-[#F4F0E7]")}
        >
          <Icon size={16} aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-[#1A1E1C] text-[#F4F0E7]">
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
        <Link href="/" className="font-mono text-base font-bold tracking-[0.18em]">
          OFFCUT<span className="ml-2 text-[10px] font-normal text-copper">ADMIN</span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      {nav}
      <div className="border-t border-white/15 p-4 text-xs">
        <p className="truncate text-[#F4F0E7]/70">{userName}</p>
        <div className="mt-2 flex gap-3">
          <Link href="/" className="underline">
            View store
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      ) : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink bg-paper px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="border border-ink p-1.5" aria-label="Open admin menu">
            <Menu size={18} />
          </button>
          <span className="font-mono text-sm font-bold tracking-widest">OFFCUT ADMIN</span>
        </header>
        <main id="main" className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
