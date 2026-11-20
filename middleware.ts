import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Route protection by role (see PROTECTED_ROUTES in lib/auth.config.ts).
 * Runs before the page renders. Server actions re-check roles themselves — never trust the client.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/supplier/:path*", "/account/:path*", "/checkout/:path*"],
};
