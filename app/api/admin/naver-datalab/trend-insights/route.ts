import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { deriveSeasonalityInsights, deriveSegmentInsights } from "@/lib/trend-segment-insights";
import { CATEGORY_KEYWORDS } from "@/lib/admin-naver-datalab-keywords";
import { getTrendOverviewBaseData, VALID_PERIODS } from "../_lib/overview";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period") ?? "3m";
  if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (1m, 3m, 1y, 3y, 10y)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const baseData = await getTrendOverviewBaseData(period, "full");
    const [segmentInsights, seasonalityInsights] = await Promise.all([
      deriveSegmentInsights(CATEGORY_KEYWORDS, baseData.successfulCategoryData, period).catch(() => []),
      Promise.resolve(deriveSeasonalityInsights(baseData.successfulCategoryData, period)),
    ]);

    return Response.json(
      {
        data: {
          mode: baseData.mode,
          period: baseData.period,
          segmentInsights,
          seasonalityInsights,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "트렌드 인사이트 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
