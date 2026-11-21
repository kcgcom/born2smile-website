import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, secondsUntilMidnightKST } from "../_lib/cache";
import { fetchGA4BaseReports, fetchGA4Data, getGA4PeriodDates } from "@/lib/admin-analytics";

const VALID_PERIODS = ["7d", "28d", "30d", "90d", "180d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period") ?? "30d";
  const scope = request.nextUrl.searchParams.get("scope") === "basic" ? "basic" as const : "full" as const;
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 28d, 30d, 90d, 180d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const dates = getGA4PeriodDates(period);
    const loadBaseReports = createCachedFetcher(
      `ga4-base-v1-${period}-${dates.end}`,
      () => fetchGA4BaseReports(dates),
      secondsUntilMidnightKST,
    );
    const baseReports = await loadBaseReports();
    const getData = createCachedFetcher(
      `ga4-v2-${period}-${dates.end}-${scope}`,
      () => fetchGA4Data(dates, scope, baseReports),
      secondsUntilMidnightKST,
    );
    const data = await getData();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    Sentry.captureException(e);
    const message =
      e instanceof Error ? e.message : "Google Analytics 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
