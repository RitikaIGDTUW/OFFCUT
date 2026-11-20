import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { dbConnect } from "./db";
import { User, type Role } from "@/models/User";
import { Supplier } from "@/models/Supplier";

/**
 * Authorisation helpers.
 * Middleware already blocks the wrong roles from whole URL prefixes, but the client can call
 * server actions directly, so every mutation re-checks here against the DATABASE
 * (not just the JWT) — a blocked user or a demoted admin loses access immediately.
 */
export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
  };
}

/** For pages: redirect to login if not signed in / wrong role. */
export async function requirePageUser(roles?: Role[], callbackUrl = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (roles && !roles.includes(user.role)) redirect("/?denied=1");
  return user;
}

export class AuthError extends Error {}

/** For server actions / route handlers: throw if not allowed. Re-reads role from DB. */
export async function assertRole(roles?: Role[]): Promise<SessionUser> {
  const s = await getSessionUser();
  if (!s) throw new AuthError("Please sign in first.");
  await dbConnect();
  const u = await User.findById(s.id).select("role isBlocked email name").lean();
  if (!u || u.isBlocked) throw new AuthError("Your account is not active.");
  if (roles && !roles.includes(u.role)) throw new AuthError("You do not have permission to do that.");
  return { id: s.id, email: u.email, name: u.name, role: u.role };
}

export const assertAdmin = () => assertRole(["admin"]);

/** Returns the supplier profile belonging to the signed-in supplier. */
export async function assertSupplier() {
  const user = await assertRole(["supplier", "admin"]);
  const supplier = await Supplier.findOne({ userId: user.id });
  if (!supplier) throw new AuthError("Complete supplier onboarding first.");
  return { user, supplier };
}

/** Converts thrown errors into the ActionResult shape used by forms. */
export function actionError(e: unknown): { ok: false; error: string } {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof Error) {
    console.error("[action]", e);
    if (/E11000/.test(e.message)) return { ok: false, error: "That value already exists (duplicate)." };
    return { ok: false, error: e.message || "Something went wrong." };
  }
  return { ok: false, error: "Something went wrong." };
}
