import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <AppShell
      title="Super Admin"
      subtitle="Manage platform admins"
      roleLabel="SUPER ADMIN"
      userName={session.user.name ?? "Super Admin"}
      userEmail={session.user.email ?? ""}
      avatarUrl={session.user.avatarUrl}
      navItems={[{ href: "/super-admin", label: "Dashboard", exact: true, icon: "dashboard" }]}
    >
      {children}
    </AppShell>
  );
}
