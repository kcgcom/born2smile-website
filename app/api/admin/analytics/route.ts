import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchGA4Data } from "@/lib/admin-analytics";

const VALID_PERIODS = ["7d", "30d", "90d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period") ?? "7d";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 30d, 90d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const getData = createCachedFetcher(
      `ga4-${period}`,
      () => fetchGA4Data(period),
      CACHE_TTL.GA4_SUMMARY,
    );
    const data = await getData();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Google Analytics 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
