import { auth } from "@/lib/auth";
import { EmployeeTransactions } from "@/components/employee/employee-transactions";

export default async function EmployeeTransactionsPage() {
  const session = await auth();
  return <EmployeeTransactions currency={session?.user.currency ?? "AED"} />;
}
