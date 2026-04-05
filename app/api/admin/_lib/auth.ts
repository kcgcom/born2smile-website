import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
