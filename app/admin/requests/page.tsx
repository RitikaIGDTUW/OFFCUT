import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { MaterialRequest } from "@/models/misc";
import { Product } from "@/models/Product";
import "@/models/User";
import { escapeRegex, formatDate, formatINR, plain } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { MatchRequestForm } from "@/components/admin/widgets";

export const metadata = { title: "Material wanted" };

export default async function RequestsAdminPage() {
  await dbConnect();
  const reqs = plain(await MaterialRequest.find().populate("userId", "name email").sort({ status: 1, createdAt: -1 }).limit(300).lean());
  // Suggest candidate lots for open requests by matching words in the material description.
  const suggestions = new Map<string, { lotNumber: string; title: string; slug: string }[]>();
  for (const r of reqs.filter((x) => x.status === "open")) {
    const words = r.material.split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
    if (!words.length) continue;
    const re = new RegExp(words.map(escapeRegex).join("|"), "i");
    const lots = await Product.find({ status: "active", $or: [{ title: re }, { materialType: re }, { tags: re }] }).select("lotNumber title slug").limit(4).lean();
    suggestions.set(r._id, plain(lots));
  }
  return (
    <>
      <PageHeader eyebrow="Demand" title={<>Material <em>wanted</em></>}>
        Buyers&apos; requests. Enter matching lot numbers to email the buyer with links.
      </PageHeader>
      <ul className="space-y-3">
        {reqs.map((r) => {
          const u = r.userId as unknown as { name?: string; email?: string };
          const sugg = suggestions.get(r._id) ?? [];
          return (
            <li key={r._id} className="grid gap-4 border border-ink p-4 md:grid-cols-[1fr_320px]">
              <div>
                <p className="flex items-center gap-2 text-lg font-medium">
                  {r.material} <StatusBadge status={r.status} />
                </p>
                <p className="text-sm text-graphite">
                  {[r.dimensionsNeeded, r.quantity, r.budget ? `budget ${formatINR(r.budget)}` : null].filter(Boolean).join(" · ")}
                </p>
                {r.notes ? <p className="mt-1 text-sm">“{r.notes}”</p> : null}
                <p className="spec mt-2 text-[10px] text-graphite">
                  {u?.name} · {u?.email} · {formatDate(r.createdAt)}
                </p>
                {sugg.length ? (
                  <p className="mt-2 text-xs">
                    Possible matches:{" "}
                    {sugg.map((l) => (
                      <Link key={l.slug} href={`/lot/${l.slug}`} target="_blank" className="mr-2 font-mono underline">
                        {l.lotNumber}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
              {r.status === "matched" ? <p className="text-sm text-moss">Matched {r.matchedProductIds.length} lot(s). {r.adminNote}</p> : <MatchRequestForm id={r._id} status={r.status} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
