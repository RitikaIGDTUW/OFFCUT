import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { AddressCard, NewAddressButton } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const s = await requirePageUser();
  await dbConnect();
  const u = await User.findById(s.id).select("addresses").lean();
  const addresses = plain(u?.addresses ?? []);
  return (
    <>
      <PageHeader eyebrow="Account" title={<>Saved <em>addresses</em></>} />
      <div className="mb-6">
        <NewAddressButton />
      </div>
      {addresses.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard key={a._id} a={{ ...a, line2: a.line2 ?? "" }} />
          ))}
        </ul>
      ) : (
        <p className="text-graphite">No saved addresses yet. Addresses you use at checkout can be saved here.</p>
      )}
    </>
  );
}
