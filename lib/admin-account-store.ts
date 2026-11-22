import { getAdminAccess } from "./admin-role-server";
import { getSupabaseAdmin } from "./supabase-admin";
import type { AdminAccess, AdminPermission } from "./admin-access";

export async function resolveAdminAccess(email?: string): Promise<AdminAccess | null> {
  if (!email) return null;
  const configured = getAdminAccess(email);
  if (configured?.isOwner) return configured;

  const { data, error } = await getSupabaseAdmin().from("admin_staff_accounts")
    .select("permissions,enabled").eq("email", email.toLowerCase()).maybeSingle();
  if (error && error.code !== "PGRST205" && error.code !== "42P01") throw error;
  if (data) return data.enabled ? { isOwner: false, permissions: data.permissions as AdminPermission[] } : null;
  return configured;
}
