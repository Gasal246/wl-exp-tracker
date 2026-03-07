import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  await connectToDatabase();

  const balanceAgg = await Transaction.aggregate([
    { $match: { adminId: new Types.ObjectId(session.user.id) } },
    {
      $group: {
        _id: null,
        credit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amountAdmin", 0] } },
        debit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amountAdmin", 0] } },
      },
    },
  ]);

  const totalBalance = (balanceAgg[0]?.credit ?? 0) - (balanceAgg[0]?.debit ?? 0);

  return (
    <AppShell
      title="Admin Workspace"
      subtitle="Track employees and petty cash"
      roleLabel="ADMIN"
      userName={session.user.name ?? "Admin"}
      userEmail={session.user.email ?? ""}
      avatarUrl={session.user.avatarUrl}
      balanceAmount={totalBalance}
      balanceCurrency={session.user.currency}
      navItems={[
        { href: "/admin", label: "Dashboard", exact: true, icon: "dashboard" },
        { href: "/admin/employees", label: "Employees", icon: "employees" },
        { href: "/admin/profile", label: "Profile", icon: "profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
