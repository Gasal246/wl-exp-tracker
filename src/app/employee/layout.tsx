import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "EMPLOYEE") {
    redirect("/");
  }

  await connectToDatabase();

  const balanceAgg = await Transaction.aggregate([
    { $match: { employeeId: new Types.ObjectId(session.user.id) } },
    {
      $group: {
        _id: null,
        credit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amountEmployee", 0] } },
        debit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amountEmployee", 0] } },
      },
    },
  ]);

  const balance = (balanceAgg[0]?.credit ?? 0) - (balanceAgg[0]?.debit ?? 0);

  return (
    <AppShell
      title="Employee"
      subtitle="Track your expenses on the go"
      roleLabel="EMPLOYEE"
      userName={session.user.name ?? "Employee"}
      userEmail={session.user.email ?? ""}
      avatarUrl={session.user.avatarUrl}
      balanceAmount={balance}
      balanceCurrency={session.user.currency}
      navItems={[
        { href: "/employee", label: "Home", exact: true, icon: "home" },
        { href: "/employee/transactions", label: "Transactions", icon: "transactions" },
        { href: "/employee/transactions/new", label: "Add", icon: "add", mobileOnly: true },
        { href: "/employee/profile", label: "Profile", icon: "profile" },
      ]}
      mobileBottomNav
    >
      {children}
    </AppShell>
  );
}
