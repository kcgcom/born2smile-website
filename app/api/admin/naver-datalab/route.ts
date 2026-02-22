import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchNaverDatalabTrend } from "@/lib/admin-naver-datalab";

const VALID_PERIODS = ["7d", "28d", "90d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  // Graceful degradation: env vars not set → return null (not an error)
  if (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "28d";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 28d, 90d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const getData = createCachedFetcher(
      `naver-dl-${period}`,
      () => fetchNaverDatalabTrend(period),
      CACHE_TTL.NAVER_DATALAB,
    );
    const data = await getData();
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "네이버 DataLab 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
