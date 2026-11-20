import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { PageHeader } from "@/components/ui/primitives";
import { PasswordForm, ProfileForm } from "@/components/account/account-forms";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const s = await requirePageUser();
  await dbConnect();
  const u = await User.findById(s.id).select("name phone buyerType gstin image imageKey email").lean();
  return (
    <>
      <PageHeader eyebrow={u?.email ?? "Account"} title={<>Profile</>} />
      <ProfileForm initial={{ name: u?.name ?? "", phone: u?.phone, buyerType: u?.buyerType, gstin: u?.gstin, image: u?.image, imageKey: u?.imageKey }} />
      <h2 className="mb-4 mt-14 border-t border-ink pt-8 text-3xl">Change password</h2>
      <PasswordForm />
    </>
  );
}
