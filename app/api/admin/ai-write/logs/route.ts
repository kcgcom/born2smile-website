import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import {
  AI_WRITE_LOG_RETENTION_DAYS,
  deleteAiWriteLogsOlderThan,
  getAiWriteLogs,
} from "@/lib/admin-ai-write-logs";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

function getFriendlyMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  ) {
    return "ai_write_logs 테이블이 없습니다. 최신 Supabase 마이그레이션을 먼저 적용해 주세요";
  }

  return error instanceof Error ? error.message : "AI 작성 로그를 처리할 수 없습니다";
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "30");
  const daysParam = Number(
    request.nextUrl.searchParams.get("days") ?? String(AI_WRITE_LOG_RETENTION_DAYS),
  );
  const limit = Number.isFinite(limitParam) ? limitParam : 30;
  const days = Number.isFinite(daysParam) ? daysParam : AI_WRITE_LOG_RETENTION_DAYS;

  try {
    const data = await getAiWriteLogs(limit, days);
    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    return Response.json(
      { error: "API_ERROR", message: getFriendlyMessage(error) },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const daysParam = Number(
    request.nextUrl.searchParams.get("days") ?? String(AI_WRITE_LOG_RETENTION_DAYS),
  );
  const days = Number.isFinite(daysParam) ? daysParam : AI_WRITE_LOG_RETENTION_DAYS;

  try {
    const data = await deleteAiWriteLogsOlderThan(days);
    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    return Response.json(
      { error: "API_ERROR", message: getFriendlyMessage(error) },
      { status: 500, headers: HEADERS },
    );
  }
}
