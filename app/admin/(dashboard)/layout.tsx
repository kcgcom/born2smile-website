import { AuthGuard } from "@/components/admin/AuthGuard";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";
import { redirect } from "next/navigation";
import { getStaffHome } from "@/lib/admin-access";
import { getAdminAccessServer } from "@/lib/server-admin-check";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccessServer();
  if (access && !access.isOwner) redirect(getStaffHome(access));

  return (
    <AuthGuard>
      <AdminWorkspaceShell>{children}</AdminWorkspaceShell>
    </AuthGuard>
  );
}
