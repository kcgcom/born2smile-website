import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../../_lib/cache";
import { getCategoryFromSlug } from "@/lib/blog/category-slugs";
import { fetchNaverDatalabByCategory } from "@/lib/admin-naver-datalab";
import { CATEGORY_KEYWORDS } from "@/lib/admin-naver-datalab-keywords";
import { analyzeTrend } from "@/lib/trend-analysis";

const VALID_PERIODS = ["1m", "3m", "1y", "3y", "10y"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  // Graceful degradation: env vars not set → return null (not an error)
  if (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const { slug } = await params;

  // Find category keywords from CATEGORY_KEYWORDS by slug
  // (블로그 카테고리가 아닌 키워드 전용 카테고리(예: dental-choice)도 허용)
  const categoryKw = CATEGORY_KEYWORDS.find((ck) => ck.slug === slug);
  const category = getCategoryFromSlug(slug) ?? categoryKw?.category ?? null;
  if (!categoryKw) {
    return Response.json(
      { error: "BAD_REQUEST", message: "해당 카테고리의 키워드 설정이 없습니다" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const period = request.nextUrl.searchParams.get("period") ?? "3m";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (1m, 3m, 1y, 3y, 10y)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const { subGroups } = categoryKw;
    const getData = createCachedFetcher(
      `naver-trend-${slug}-${period}`,
      () => fetchNaverDatalabByCategory(subGroups, period),
      CACHE_TTL.NAVER_DATALAB,
    );
    const raw = await getData();

    // Enrich each sub-group with analyzeTrend() results
    const enrichedSubGroups = raw.groups.map((group) => {
      const { direction, changeRate, currentAvg } = analyzeTrend(group.data);
      return {
        name: group.title,
        trend: direction,
        changeRate,
        currentAvg,
        data: group.data,
      };
    });

    return Response.json(
      {
        data: {
          category,
          slug,
          period: raw.period,
          timeUnit: raw.timeUnit,
          subGroups: enrichedSubGroups,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "네이버 DataLab 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
