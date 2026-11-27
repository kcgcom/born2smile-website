import { z } from "zod/v4";
import { getAdminAccess } from "@/lib/admin-role-server";
import { resolveAdminAccess } from "@/lib/admin-account-store";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";

const headers = { "Cache-Control": "private, no-store" };
const input = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value) <= 72) });

export async function PUT(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access?.isOwner) return unauthorizedResponse(forbidden());
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "직원 이메일과 8자 이상의 비밀번호를 확인해 주세요." }, { status: 400, headers });
  const { email, password } = parsed.data;
  if (getAdminAccess(email)?.isOwner) return unauthorizedResponse(forbidden());

  const failure = () => Response.json({ message: "비밀번호를 저장하지 못했습니다. 인증 설정을 확인한 후 다시 시도해 주세요." }, { status: 503, headers });
  try {
    if (!await resolveAdminAccess(email)) return unauthorizedResponse(forbidden("사용이 허용된 직원 계정의 비밀번호만 설정할 수 있습니다."));
    const server = getSupabaseAdmin();
    const { data: id, error: lookupError } = await server.rpc("find_admin_staff_auth_user", { account_email: email });
    if (lookupError) return failure();
    const { error } = id
      ? await server.auth.admin.updateUserById(id, { password })
      : await server.auth.admin.createUser({ email, password, email_confirm: true });
    return error ? failure() : Response.json({ data: { email } }, { headers });
  } catch {
    return failure();
  }
}
