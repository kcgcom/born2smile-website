import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { ENV_VARIABLES } from "@/lib/dev-data";

/**
 * GET /api/dev/env-value?key=ENV_VAR_NAME
 * 관리자 인증 후 허용 목록에 있는 환경변수 값을 반환합니다.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { error: "key 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  // 허용 목록에 있는 변수만 반환
  const allowed = ENV_VARIABLES.find((v) => v.key === key);
  if (!allowed) {
    return NextResponse.json(
      { error: "허용되지 않은 환경변수입니다." },
      { status: 403 },
    );
  }

  const value = process.env[key] ?? "";

  return NextResponse.json(
    { data: { key, value } },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    },
  );
}
