import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "kcgcom@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

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
  if (!token) {
    return { ok: false, status: 401, error: "UNAUTHORIZED", message: "인증 토큰이 없습니다" };
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);

    if (!decoded.email_verified) {
      return { ok: false, status: 403, error: "FORBIDDEN", message: "이메일 인증이 필요합니다" };
    }

    if (!ADMIN_EMAILS.includes(decoded.email?.toLowerCase() ?? "")) {
      return { ok: false, status: 403, error: "FORBIDDEN", message: "관리자 권한이 없습니다" };
    }

    return { ok: true, email: decoded.email! };
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
