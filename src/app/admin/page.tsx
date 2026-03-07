import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();
  return <AdminDashboard currency={session?.user.currency ?? "AED"} />;
}
