import { NextRequest } from "next/server";
import { fetchBlogCardReport } from "@/lib/admin-blog-cards";
import { READING_PERIODS, readingPeriodRange, type ReadingPeriod } from "@/lib/blog/reading-report";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";
import { CACHE_TTL, createCachedFetcher } from "../../_lib/cache";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as ReadingPeriod;
  if (!READING_PERIODS.includes(period)) {
    return Response.json({ message: "조회 기간이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }

  try {
    const now = new Date();
    const { periodEndExclusive } = readingPeriodRange(period, now);
    const data = await createCachedFetcher(
      `blog-card-report-${period}-${periodEndExclusive}`,
      () => fetchBlogCardReport(period, now),
      CACHE_TTL.POSTHOG,
    )();
    return Response.json({ data }, { headers: HEADERS });
  } catch {
    return Response.json({ message: "블로그 카드 성과를 불러오지 못했습니다." }, { status: 503, headers: HEADERS });
  }
}
