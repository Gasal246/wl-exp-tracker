import { auth } from "@/lib/auth";
import { AdminProfile } from "@/components/admin/admin-profile";

export default async function AdminProfilePage() {
  const session = await auth();
  return (
    <AdminProfile
      defaultName={session?.user.name ?? "Admin"}
      defaultEmail={session?.user.email ?? ""}
      defaultCurrency={session?.user.currency ?? "AED"}
      defaultAvatarUrl={session?.user.avatarUrl ?? null}
    />
  );
}
