import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminEmployeeAddTransaction } from "@/components/admin/admin-employee-add-transaction";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export default async function AdminEmployeeAddTransactionPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="space-y-4">
      <Button asChild variant="outline">
        <Link href={`/admin/employees/${id}`}>Back to Employee</Link>
      </Button>

      <AdminEmployeeAddTransaction
        employee={{
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          currency: employee.currency,
        }}
      />
    </div>
  );
}
