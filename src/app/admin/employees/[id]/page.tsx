import { notFound } from "next/navigation";

import { AdminEmployeeOverview } from "@/components/admin/admin-employee-overview";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export default async function EmployeeOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  await connectToDatabase();

  const employee = await User.findOne({ _id: id, adminId: session.user.id, isAdmin: false })
    .select("name email currency")
    .lean();

  if (!employee) {
    notFound();
  }

  return (
    <AdminEmployeeOverview
      employee={{
        id: employee._id.toString(),
        name: employee.name,
        email: employee.email,
        currency: employee.currency,
      }}
      adminCurrency={session.user.currency}
    />
  );
}
