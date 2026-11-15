import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { classifyAgentContentAccess } from "@/lib/agent-content-access";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_CLI_SECRET = process.env.ADMIN_CLI_SECRET ?? "";

interface AuthSuccess {
  ok: true;
  email: string;
}

interface AuthFailure {
  ok: false;
  status: 401 | 403;
  error: string;
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

export async function verifyAdminRequest(request: Request): Promise<AuthResult> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");

  const agent = classifyAgentContentAccess(token, request.method, new URL(request.url).pathname, {
    content: process.env.AGENT_CONTENT_SECRET, admin: ADMIN_CLI_SECRET,
  });
  if (agent === "denied" || agent === "misconfigured") return { ok: false, status: 403, error: "FORBIDDEN", message: agent === "misconfigured" ? "에이전트 키와 관리자 키를 서로 다른 값으로 설정해야 합니다" : "에이전트에게 허용되지 않은 작업입니다" };
  if (agent !== "none") return { ok: true, email: agent };

  if (ADMIN_CLI_SECRET && token === ADMIN_CLI_SECRET) {
    return { ok: true, email: "cli@admin" };
  }

  if (ADMIN_EMAILS.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "FORBIDDEN",
      message: "관리자 허용 목록이 설정되지 않았습니다",
    };
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
    if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
      return { ok: false, status: 403, error: "FORBIDDEN", message: "관리자 권한이 없습니다" };
    }

    return { ok: true, email };
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
