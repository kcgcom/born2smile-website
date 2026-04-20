import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { getTrendOverviewWithGapData, VALID_PERIODS, type TrendOverviewMode } from "../_lib/overview";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const mode = (request.nextUrl.searchParams.get("mode") ?? "full") as TrendOverviewMode;
  const period = request.nextUrl.searchParams.get("period") ?? "3m";

  if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (1m, 3m, 1y, 3y, 10y)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (mode === "full" && (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET)) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const data = await getTrendOverviewWithGapData(period, mode);

    return Response.json(
      {
        data: {
          mode: data.mode,
          period: data.period,
          categories: data.categories,
          contentGap: data.contentGap,
          volumeSource: data.volumeSource,
          volumeCoverage: data.volumeCoverage,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "트렌드 요약 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
