import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getIndexingMonitorData } from "@/lib/admin-indexing-monitor";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    return Response.json(
      { data: await getIndexingMonitorData() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "색인 상태를 불러올 수 없습니다";
    return Response.json(
      { error: "INDEXING_STATUS_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
