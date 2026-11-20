import Link from "next/link";
import { SiteChrome } from "@/components/layout/site-chrome";
import { requirePageUser } from "@/lib/guards";

const NAV = [
  ["/supplier", "Dashboard"],
  ["/supplier/submit", "Submit off-cuts"],
  ["/supplier/submissions", "Submissions"],
  ["/supplier/lots", "Listed lots"],
  ["/supplier/onboarding", "Company & payouts"],
];

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(["supplier", "admin"], "/supplier");
  return (
    <SiteChrome>
      <div className="border-b border-ink bg-ink text-paper">
        <div className="container-x flex items-center gap-6 overflow-x-auto py-3">
          <span className="spec shrink-0 text-[10px] text-signal">Supplier portal</span>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="spec shrink-0 text-[11px] hover:text-signal">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="container-x py-10">{children}</div>
    </SiteChrome>
  );
}
