import { DefaultSession } from "next-auth";

import type { Role } from "@/types/app";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      currency: string;
      avatarUrl?: string | null;
      isAdmin?: boolean;
      adminId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    currency: string;
    avatarUrl?: string | null;
    isAdmin?: boolean;
    adminId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    currency?: string;
    avatarUrl?: string | null;
    isAdmin?: boolean;
    adminId?: string | null;
  }
}
