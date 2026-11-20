import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { MaterialRequest } from "@/models/misc";
import { Product } from "@/models/Product";
import { formatDate, formatINR, plain, sp } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { CloseRequestButton, MaterialRequestForm } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Material wanted" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePageUser(undefined, "/account/requests");
  const material = sp((await searchParams).material);
  await dbConnect();
  const reqs = plain(await MaterialRequest.find({ userId: s.id }).sort({ createdAt: -1 }).lean());
  const matchedIds = reqs.flatMap((r) => r.matchedProductIds);
  const matched = matchedIds.length ? plain(await Product.find({ _id: { $in: matchedIds } }).select("title slug lotNumber").lean()) : [];
  return (
    <>
      <PageHeader eyebrow="Account" title={<>Material <em>wanted</em></>}>
        Can&apos;t find it? Describe what you need — our team checks every incoming factory lot against open requests and emails you
        when there&apos;s a match.
      </PageHeader>
      <MaterialRequestForm defaultMaterial={material} />
      <h2 className="mt-12 text-3xl">Your requests</h2>
      <ul className="mt-4 divide-y divide-rule border-y border-ink">
        {reqs.length === 0 ? <li className="py-4 text-graphite">No requests yet.</li> : null}
        {reqs.map((r) => (
          <li key={r._id} className="flex flex-wrap items-start justify-between gap-3 py-4">
            <div>
              <p className="font-medium">{r.material}</p>
              <p className="spec mt-1 text-[10px] text-graphite">
                {[r.dimensionsNeeded, r.quantity, r.budget ? `budget ${formatINR(r.budget)}` : null, formatDate(r.createdAt)].filter(Boolean).join(" · ")}
              </p>
              {r.adminNote ? <p className="mt-1 text-sm text-graphite">OFFCUT: {r.adminNote}</p> : null}
              {r.matchedProductIds.length ? (
                <p className="mt-2 text-sm">
                  Matches:{" "}
                  {matched
                    .filter((m) => r.matchedProductIds.includes(m._id))
                    .map((m) => (
                      <Link key={m._id} href={`/lot/${m.slug}`} className="mr-3 underline">
                        #{m.lotNumber} {m.title}
                      </Link>
                    ))}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.status === "open" ? <CloseRequestButton id={r._id} /> : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
