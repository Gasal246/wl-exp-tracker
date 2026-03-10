import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { EmployeeTransactions } from "@/components/employee/employee-transactions";

export default async function EmployeeTransactionsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div className="hidden md:flex md:justify-end">
        <Button asChild>
          <Link href="/employee/transactions/new">Add Transaction</Link>
        </Button>
      </div>
      <EmployeeTransactions currency={session?.user.currency ?? "AED"} />
    </div>
  );
}
