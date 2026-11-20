import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/constants";

/**
 * Edge-safe part of the Auth.js config (no database / bcrypt imports), shared by
 * `middleware.ts` and the full config in `lib/auth.ts`.
 */

/** Which roles may open which URL prefixes. Checked in middleware AND again in every server action. */
export const PROTECTED_ROUTES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/supplier", roles: ["supplier", "admin"] },
  { prefix: "/account", roles: ["buyer", "supplier", "admin"] },
  { prefix: "/checkout", roles: ["buyer", "supplier", "admin"] },
];

export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "buyer";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "buyer";
      }
      return session;
    },
    /** Called by middleware for every matched request. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const rule = PROTECTED_ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
      if (!rule) return true;
      if (!auth?.user) return false; // → redirect to /login?callbackUrl=...
      if (!rule.roles.includes(auth.user.role)) {
        return Response.redirect(new URL("/?denied=1", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
