import { auth } from "@/lib/auth";
import { EmployeeProfile } from "@/components/employee/employee-profile";

export default async function EmployeeProfilePage() {
  const session = await auth();

  return (
    <EmployeeProfile
      defaultName={session?.user.name ?? "Employee"}
      defaultEmail={session?.user.email ?? ""}
      defaultCurrency={session?.user.currency ?? "AED"}
      defaultAvatarUrl={session?.user.avatarUrl ?? null}
    />
  );
}
