import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Review } from "@/models/misc";
import "@/models/Product";
import { formatDate, plain } from "@/lib/utils";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";
import { ReviewActions } from "@/components/admin/widgets";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdminPage() {
  await dbConnect();
  const reviews = plain(await Review.find().populate("productId", "title slug lotNumber").sort({ isApproved: 1, createdAt: -1 }).limit(300).lean());
  const pending = reviews.filter((r) => !r.isApproved).length;
  return (
    <>
      <PageHeader eyebrow="Moderation" title={<>Reviews</>}>
        {pending} awaiting moderation.
      </PageHeader>
      <ul className="divide-y divide-rule border-y border-ink">
        {reviews.map((r) => {
          const p = r.productId as unknown as { title?: string; slug?: string; lotNumber?: string } | null;
          return (
            <li key={r._id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-signal">{"★".repeat(r.rating)}</span>
                  <b>{r.title}</b>
                  {r.isApproved ? <Badge tone="moss">Published</Badge> : <Badge tone="signal">Pending</Badge>}
                  {r.verifiedPurchase ? <Badge>Verified buyer</Badge> : null}
                </p>
                <p className="mt-1 text-sm text-graphite">{r.body}</p>
                {r.photos.length ? (
                  <div className="mt-2 flex gap-2">
                    {r.photos.map((ph) => (
                      <span key={ph.url} className="relative h-14 w-14 border border-ink">
                        <SafeImage src={ph.url} alt="" fill sizes="56px" className="object-cover" />
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="spec mt-2 text-[10px] text-graphite">
                  {r.userName} · {formatDate(r.createdAt)} ·{" "}
                  {p?.slug ? (
                    <Link href={`/lot/${p.slug}`} className="underline">
                      #{p.lotNumber} {p.title}
                    </Link>
                  ) : (
                    "deleted lot"
                  )}
                </p>
              </div>
              <ReviewActions id={r._id} approved={r.isApproved} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
