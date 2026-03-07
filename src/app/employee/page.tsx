import { auth } from "@/lib/auth";
import { EmployeeHome } from "@/components/employee/employee-home";

export default async function EmployeePage() {
  const session = await auth();

  return <EmployeeHome currency={session?.user.currency ?? "AED"} />;
}
