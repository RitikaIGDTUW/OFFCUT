import Link from "next/link";
import type { ReactNode } from "react";
import { getSettings } from "@/lib/settings";
import { getCategories, getImpactStats } from "@/lib/catalog";
import { getSessionUser } from "@/lib/guards";
import { formatNumber } from "@/lib/utils";
import { HeaderActions, MobileNav } from "./header-client";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { NewsletterForm } from "@/components/shop/newsletter-form";

/** Header + footer wrapper used by the shop, auth, account and supplier sections. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const [settings, stats, categories, user] = await Promise.all([
    getSettings(),
    getImpactStats(),
    getCategories(),
    getSessionUser(),
  ]);
  const tonnes = (stats.kgDiverted / 1000).toFixed(1);
  const tickerItems = [
    `DIVERTED FROM LANDFILL: ${tonnes} T`,
    settings.announcement,
    `${formatNumber(stats.liveLots)} LIVE LOTS`,
    `CO₂ AVOIDED: ${formatNumber(stats.co2SavedKg / 1000, 1)} T`,
    "EVERY LOT MEASURED TO THE MILLIMETRE",
  ].filter(Boolean);

  const nav = [
    { href: "/shop", label: "Shop all" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/sustainability", label: "Impact" },
    { href: "/suppliers", label: "Sell off-cuts" },
  ];

  return (
    <>
      {/* Marquee ticker */}
      <div className="overflow-hidden border-b border-ink bg-ink text-paper" aria-label="Announcements">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap py-1.5 font-mono text-[11px] uppercase tracking-spec">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="flex items-center gap-3" aria-hidden={i >= tickerItems.length}>
              <span className="inline-block h-1.5 w-1.5 bg-signal" />
              {t}
            </span>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-ink bg-paper/95 backdrop-blur">
        <div className="container-x flex h-16 items-center gap-4">
          <MobileNav nav={nav} categories={categories.filter((c) => !c.parent).map((c) => ({ name: c.name, slug: c.slug }))} />
          <Link href="/" className="flex items-baseline gap-2" aria-label="OFFCUT home">
            <span className="font-mono text-lg font-bold tracking-[0.18em]">OFFCUT</span>
            <span className="hidden font-mono text-[10px] text-graphite sm:inline">⌐ EST. 2026</span>
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center gap-6 lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="spec text-[11px] hover:underline hover:decoration-signal hover:underline-offset-4">
                {n.label}
              </Link>
            ))}
          </nav>
          <HeaderActions user={user ? { name: user.name, role: user.role } : null} />
        </div>
        {/* Category strip */}
        <nav aria-label="Categories" className="hidden border-t border-rule md:block">
          <div className="container-x flex gap-6 overflow-x-auto py-2">
            {categories
              .filter((c) => !c.parent)
              .map((c) => (
                <Link key={c._id} href={`/shop/${c.slug}`} className="spec whitespace-nowrap text-[10px] text-graphite hover:text-ink">
                  {c.name}
                </Link>
              ))}
          </div>
        </nav>
      </header>

      <main id="main" className="min-h-[60vh]">
        {children}
      </main>

      <CartDrawer />

      <footer className="mt-24 border-t border-ink bg-ink text-paper">
        <div className="container-x grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-5xl leading-none">
              Industrial-grade leftovers.
              <br />
              <em className="text-signal">Maker-grade prices.</em>
            </p>
            <p className="mt-6 max-w-sm text-sm text-paper/70">
              Get the Friday drop list: new lots, graded and measured, before they hit the shop.
            </p>
            <div className="mt-4 max-w-sm">
              <NewsletterForm dark />
            </div>
          </div>
          <FooterCol
            title="Shop"
            links={[
              ["/shop", "All lots"],
              ["/shop?sort=discount", "Biggest discounts"],
              ["/search", "Search"],
              ["/account/requests", "Material wanted"],
            ]}
          />
          <FooterCol
            title="OFFCUT"
            links={[
              ["/about", "About"],
              ["/how-it-works", "How it works"],
              ["/sustainability", "Sustainability"],
              ["/suppliers", "For factories"],
              ["/contact", "Contact"],
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              ["/faq", "FAQ"],
              ["/shipping-returns", "Shipping & returns"],
              ["/terms", "Terms"],
              ["/privacy", "Privacy"],
            ]}
          />
        </div>
        <div className="border-t border-paper/20">
          <div className="container-x flex flex-col gap-2 py-4 font-mono text-[10px] uppercase tracking-spec text-paper/60 sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} OFFCUT · {settings.contact.email} · {settings.contact.phone}
            </span>
            <span>Photos: Unsplash/Pexels · College project demo — not a real store</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <p className="spec mb-4 text-[10px] text-paper/50">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-signal">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
