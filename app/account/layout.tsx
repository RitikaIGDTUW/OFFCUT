import Link from "next/link";
import { SiteChrome } from "@/components/layout/site-chrome";
import { requirePageUser } from "@/lib/guards";

const NAV = [
  ["/account", "Dashboard"],
  ["/account/orders", "Orders"],
  ["/account/wishlist", "Wishlist"],
  ["/account/requests", "Material wanted"],
  ["/account/addresses", "Addresses"],
  ["/account/profile", "Profile & password"],
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(undefined, "/account");
  return (
    <SiteChrome>
      <div className="container-x grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
        <aside aria-label="Account navigation">
          <p className="spec text-[10px] text-graphite">Signed in as</p>
          <p className="mt-1 truncate font-medium">{user.name}</p>
          <nav className="mt-6 flex gap-1 overflow-x-auto border-ink lg:flex-col lg:border-l">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="spec whitespace-nowrap px-3 py-2 text-[11px] hover:bg-paper-2">
                {label}
              </Link>
            ))}
            {user.role !== "buyer" ? (
              <Link href={user.role === "admin" ? "/admin" : "/supplier"} className="spec whitespace-nowrap px-3 py-2 text-[11px] text-signal hover:bg-paper-2">
                {user.role === "admin" ? "Admin panel →" : "Supplier portal →"}
              </Link>
            ) : null}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </SiteChrome>
  );
}
