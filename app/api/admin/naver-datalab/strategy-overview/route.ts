import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { buildPageUpdateOpportunities, deriveInsightActions, generateFaqSuggestions } from "@/lib/trend-insights";
import { generateBlogBriefSuggestions, generatePageImprovementBriefs } from "@/lib/trend-briefs";
import { getTrendOverviewWithGapData, VALID_PERIODS } from "../_lib/overview";

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

  try {
    const data = await getTrendOverviewWithGapData(period, "volume");
    const insightActions = deriveInsightActions(data.contentGap);
    const faqSuggestions = generateFaqSuggestions(data.contentGap);
    const pageOpportunities = buildPageUpdateOpportunities(data.contentGap);
    const blogBriefs = generateBlogBriefSuggestions(data.contentGap);
    const pageBriefs = generatePageImprovementBriefs(pageOpportunities, faqSuggestions);

    return Response.json(
      {
        data: {
          mode: data.mode,
          period: data.period,
          contentGap: data.contentGap,
          insightActions,
          faqSuggestions,
          pageOpportunities,
          blogBriefs,
          pageBriefs,
          volumeSource: data.volumeSource,
          volumeCoverage: data.volumeCoverage,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "콘텐츠 전략 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
