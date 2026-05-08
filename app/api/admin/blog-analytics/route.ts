import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchBlogPostGA4Data } from "@/lib/admin-analytics";

const VALID_PERIODS = ["28d", "90d", "180d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period") ?? "28d";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (28d, 90d, 180d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const getData = createCachedFetcher(
      `blog-ga4-${period}`,
      () => fetchBlogPostGA4Data(period),
      CACHE_TTL.GA4_SUMMARY,
    );
    const data = await getData();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return Response.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
