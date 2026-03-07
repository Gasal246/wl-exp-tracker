import Link from "next/link";

import { AdminEmployeeTransactions } from "@/components/admin/admin-employee-transactions";
import { Button } from "@/components/ui/button";

export default async function EmployeeTransactionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminEmployeeTransactions
      employeeId={id}
      headerLeft={
        <Button asChild variant="outline">
          <Link href={`/admin/employees/${id}`}>Back</Link>
        </Button>
      }
    />
  );
}
