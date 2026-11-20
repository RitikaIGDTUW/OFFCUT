import { dbConnect } from "@/lib/db";
import { getSessionUser } from "@/lib/guards";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { plain } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { UsersTable } from "@/components/admin/widgets";

export const metadata = { title: "Users" };

export default async function UsersAdminPage() {
  await dbConnect();
  const me = await getSessionUser();
  const [users, stats] = await Promise.all([
    User.find().select("name email role isBlocked createdAt emailVerified").sort({ createdAt: -1 }).lean(),
    Order.aggregate<{ _id: string; n: number; spent: number }>([
      { $match: { orderStatus: { $nin: ["cancelled", "returned"] } } },
      { $group: { _id: "$userId", n: { $sum: 1 }, spent: { $sum: "$total" } } },
    ]),
  ]);
  const by = new Map(stats.map((s) => [String(s._id), s]));
  const rows = plain(users).map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    isBlocked: u.isBlocked,
    createdAt: u.createdAt,
    verified: Boolean(u.emailVerified),
    orders: by.get(u._id)?.n ?? 0,
    spent: by.get(u._id)?.spent ?? 0,
  }));
  return (
    <>
      <PageHeader eyebrow="People" title={<>Users <span className="font-mono text-2xl text-graphite">({rows.length})</span></>}>
        Role changes take effect on the user&apos;s next sign-in for page access, and immediately for every server action (roles are re-checked against the database).
      </PageHeader>
      <UsersTable rows={rows} selfId={me?.id ?? ""} />
    </>
  );
}
