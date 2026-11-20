import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getLots } from "@/lib/catalog";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { LotGrid } from "@/components/shop/lot-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const s = await requirePageUser();
  await dbConnect();
  const u = await User.findById(s.id).select("wishlist").lean();
  const ids = u?.wishlist ?? [];
  const lots = ids.length ? await getLots({ _id: { $in: ids }, status: { $in: ["active", "sold-out"] } }, { createdAt: -1 }, 100) : [];
  return (
    <>
      <PageHeader eyebrow="Account" title={<>Your <em>wishlist</em></>} />
      {lots.length ? (
        <LotGrid lots={lots} />
      ) : (
        <EmptyState title="Nothing saved." action={<Button asChild variant="signal"><Link href="/shop">Browse lots</Link></Button>}>
          Tap the heart on any lot to save it here.
        </EmptyState>
      )}
    </>
  );
}
