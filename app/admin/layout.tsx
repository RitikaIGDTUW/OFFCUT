import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · OFFCUT Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(["admin"], "/admin");
  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
