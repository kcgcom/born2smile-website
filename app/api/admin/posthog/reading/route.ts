import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchBlogReading } from "@/lib/admin-blog-reading";
import { READING_PERIODS, readingPeriodRange, type ReadingPeriod, type ReadingReport } from "@/lib/blog/reading-report";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
class PartialReadingResult extends Error {
  constructor(readonly data: ReadingReport) { super("부분 조회 실패"); }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as ReadingPeriod;
  const cursor = request.nextUrl.searchParams.get("cursor") || null;
  if (!READING_PERIODS.includes(period) || (cursor !== null && !/^[a-z0-9][a-z0-9-]{0,199}$/.test(cursor))) {
    return Response.json({ error: "BAD_REQUEST", message: "조회 기간 또는 페이지가 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const range = readingPeriodRange(period);
    const fetcher = createCachedFetcher(`blog-reading-${range.measurementVersion}-${period}-${range.periodEndExclusive}-${cursor ?? "first"}`, async () => {
      const data = await fetchBlogReading(period, cursor);
      if (data.meta.partial) throw new PartialReadingResult(data);
      return data;
    }, CACHE_TTL.POSTHOG);
    let data: ReadingReport;
    try { data = await fetcher(); }
    catch (error) { if (error instanceof PartialReadingResult) data = error.data; else throw error; }
    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "읽기 분석 데이터를 불러오지 못했습니다." }, { status: 500, headers: HEADERS });
  }
}
