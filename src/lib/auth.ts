import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { connectToDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { SuperAdmin } from "@/models/SuperAdmin";
import { User as UserModel } from "@/models/User";
import type { Role } from "@/types/app";

const credentialSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        await connectToDatabase();

        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;

        const superAdmin = await SuperAdmin.findOne({ email }).lean();
        if (superAdmin) {
          const valid = await verifyPassword(password, superAdmin.passwordHash);
          if (!valid) return null;

          return {
            id: superAdmin._id.toString(),
            name: superAdmin.name,
            email: superAdmin.email,
            role: "SUPER_ADMIN" as Role,
            currency: superAdmin.currency,
            avatarUrl: superAdmin.avatarUrl,
          };
        }

        const user = await UserModel.findOne({ email, isActive: true }).lean();
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.isAdmin ? ("ADMIN" as Role) : ("EMPLOYEE" as Role),
          currency: user.currency,
          avatarUrl: user.avatarUrl,
          isAdmin: user.isAdmin,
          adminId: user.adminId ? user.adminId.toString() : null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.currency = (user as { currency: string }).currency;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
        token.adminId = (user as { adminId?: string | null }).adminId ?? null;
      }

      if (trigger === "update" && session) {
        const partial = session as {
          name?: string;
          currency?: string;
          avatarUrl?: string | null;
        };

        if (typeof partial.name === "string" && partial.name.trim()) {
          token.name = partial.name.trim();
        }

        if (typeof partial.currency === "string" && partial.currency.trim()) {
          token.currency = partial.currency.trim().toUpperCase();
        }

        if ("avatarUrl" in partial) {
          token.avatarUrl = partial.avatarUrl ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.role = token.role as Role;
        session.user.currency = (token.currency as string) ?? "AED";
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.adminId = (token.adminId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
