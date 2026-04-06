import { AuthGuard } from "@/components/admin/AuthGuard";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminWorkspaceShell>{children}</AdminWorkspaceShell>
    </AuthGuard>
  );
}
