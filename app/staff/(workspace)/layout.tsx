import { AuthGuard } from "@/components/admin/AuthGuard";
import { StaffWorkspaceShell } from "@/components/admin/StaffWorkspaceShell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><StaffWorkspaceShell>{children}</StaffWorkspaceShell></AuthGuard>;
}
