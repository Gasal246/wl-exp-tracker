import Link from "next/link";

import { AddEmployeeForm } from "@/components/admin/add-employee-form";
import { Button } from "@/components/ui/button";

export default function AddEmployeePage() {
  return (
    <div className="space-y-4">
      <Button asChild variant="outline">
        <Link href="/admin/employees">Back to Employees</Link>
      </Button>
      <AddEmployeeForm />
    </div>
  );
}
