import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { dbConnect } from "./db";
import { features } from "./env";
import { loginSchema } from "./validations/auth";
import { rateLimit } from "./rate-limit";
import { User, type Role } from "@/models/User";

/**
 * Full Auth.js (NextAuth v5) setup.
 * - Credentials (email + bcrypt password) is the main login.
 * - Google is added ONLY when AUTH_GOOGLE_ID/SECRET are set.
 * - Sessions are JWTs carrying the user's id and role.
 */
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (!rateLimit(`login:${email}`, 8, 60_000)) return null; // 8 tries/minute per email

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
        if (!user?.passwordHash || user.isBlocked) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user._id.toString(), name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
    ...(features.google ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Google sign-in: create the Mongo user on first login, refuse blocked users.
      if (account?.provider === "google" && user.email) {
        await dbConnect();
        let dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name ?? user.email.split("@")[0],
            email: user.email.toLowerCase(),
            image: user.image ?? undefined,
            emailVerified: new Date(),
            role: "buyer",
          });
        }
        if (dbUser.isBlocked) return false;
        user.id = dbUser._id.toString();
        user.role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "buyer";
      }
      // After a role change (e.g. buyer → supplier) the client calls update() to refresh the token.
      if (trigger === "update" && token.id) {
        await dbConnect();
        const fresh = await User.findById(token.id).select("role name image").lean();
        if (fresh) {
          token.role = fresh.role as Role;
          token.name = fresh.name;
          token.picture = fresh.image;
        }
      }
      return token;
    },
  },
});
