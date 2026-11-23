import { z } from "zod/v4";
import { listConfiguredAdminAccounts, getAdminAccess } from "@/lib/admin-role-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store" };
const accountInput = z.object({
  email: z.email().max(254).transform((email) => email.toLowerCase()),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access?.isOwner) return unauthorizedResponse(forbidden());
  const db = getSupabaseAdmin();
  const now = Date.now();
  const [staff, presence] = await Promise.all([
    db.from("admin_staff_accounts").select("email,enabled").order("email"),
    db.from("admin_browser_presence").select("email,browser_id,device_name,public_ip,last_seen_at")
      .gte("last_seen_at", new Date(now - 86_400_000).toISOString())
      .order("last_seen_at", { ascending: false }).limit(200),
  ]);
  if (staff.error || presence.error) return Response.json({ message: "계정·접속 목록을 불러올 수 없습니다." }, { status: 503, headers: HEADERS });
  const accounts = new Map(listConfiguredAdminAccounts().map((account) => [account.email, account]));
  for (const row of staff.data) {
    if (accounts.get(row.email)?.isOwner) continue;
    accounts.set(row.email, { ...row, isOwner: false });
  }
  return Response.json({ data: {
    accounts: [...accounts.values()].sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.email.localeCompare(b.email)),
    presence: presence.data,
    checkedAt: now,
  } }, { headers: HEADERS });
}

export async function PUT(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access?.isOwner) return unauthorizedResponse(forbidden());
  const parsed = accountInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "이메일과 계정 사용 상태를 확인해 주세요." }, { status: 400, headers: HEADERS });
  const { email, enabled } = parsed.data;
  if (getAdminAccess(email)?.isOwner) return unauthorizedResponse(forbidden("원장 계정은 서버 설정에서 관리합니다."));
  const { error } = await getSupabaseAdmin().from("admin_staff_accounts").upsert({
    // Keep new rows compatible with the existing database constraint and older deployments.
    email, permissions: ["content", "staff"], enabled, updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ message: "직원 계정을 저장할 수 없습니다." }, { status: 503, headers: HEADERS });
  return Response.json({ data: { email } }, { headers: HEADERS });
}
