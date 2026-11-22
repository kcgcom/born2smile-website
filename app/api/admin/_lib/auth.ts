import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { classifyAgentContentAccess } from "@/lib/agent-content-access";

import { canUseAdminApi, hasPasswordAuthentication, OWNER_ACCESS, type AdminAccess } from "@/lib/admin-access";
import { resolveAdminAccess } from "@/lib/admin-account-store";

const ADMIN_CLI_SECRET = process.env.ADMIN_CLI_SECRET ?? "";

interface AuthSuccess {
  ok: true;
  email: string;
  access: AdminAccess | null;
}

interface AuthFailure {
  ok: false;
  status: 401 | 403;
  error: string;
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

export function forbidden(message = "이 작업을 수행할 권한이 없습니다"): AuthFailure {
  return { ok: false, status: 403, error: "FORBIDDEN", message };
}

export async function verifyAdminRequest(request: Request): Promise<AuthResult> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const pathname = new URL(request.url).pathname;

  const agent = classifyAgentContentAccess(token, request.method, pathname, {
    content: process.env.AGENT_CONTENT_SECRET, admin: ADMIN_CLI_SECRET,
  });
  if (agent === "denied" || agent === "misconfigured") return { ok: false, status: 403, error: "FORBIDDEN", message: agent === "misconfigured" ? "에이전트 키와 관리자 키를 서로 다른 값으로 설정해야 합니다" : "에이전트에게 허용되지 않은 작업입니다" };
  if (agent !== "none") return { ok: true, email: agent, access: null };

  if (ADMIN_CLI_SECRET && token === ADMIN_CLI_SECRET) {
    return { ok: true, email: "cli@admin", access: OWNER_ACCESS };
  }

  if (!token) {
    return { ok: false, status: 401, error: "UNAUTHORIZED", message: "인증 토큰이 없습니다" };
  }

  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);

    if (error || !user) {
      return { ok: false, status: 401, error: "UNAUTHORIZED", message: "유효하지 않은 인증 토큰입니다" };
    }

    const email = user.email;
    const access = await resolveAdminAccess(email);
    if (!email || !access || !canUseAdminApi(access, request.method, pathname)) return forbidden();
    if (!access.isOwner) {
      const { data, error: claimsError } = await getSupabaseAdmin().auth.getClaims(token);
      if (claimsError || !hasPasswordAuthentication(data?.claims.amr)) {
        return forbidden("직원 계정은 이메일과 비밀번호로 로그인해 주세요.");
      }
    }
    return { ok: true, email, access };
  } catch {
    return { ok: false, status: 401, error: "UNAUTHORIZED", message: "유효하지 않은 인증 토큰입니다" };
  }
}

export function unauthorizedResponse(result: AuthFailure): Response {
  return Response.json(
    { error: result.error, message: result.message },
    {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
