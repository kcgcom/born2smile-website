import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { streamAdminUpdates } from "../../_lib/stream";
import { fetchBlogReading } from "@/lib/admin-blog-reading";
import { READING_PERIODS, readingPeriodRange, type ReadingPeriod, type ReadingReportUpdate } from "@/lib/blog/reading-report";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as ReadingPeriod;
  const cursor = request.nextUrl.searchParams.get("cursor") || null;
  if (!READING_PERIODS.includes(period) || (cursor !== null && !/^[a-z0-9][a-z0-9-]{0,199}$/.test(cursor))) {
    return Response.json({ error: "BAD_REQUEST", message: "조회 기간 또는 페이지가 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const now = new Date();
    const range = readingPeriodRange(period, now);
    const load = (onUpdate?: (update: ReadingReportUpdate) => void) => fetchBlogReading(period, cursor, {
      now,
      onUpdate,
      cacheQuery(section, run) {
        if (section === "first") {
          return createCachedFetcher(`blog-reading-first-${range.measurementVersion}`, run, CACHE_TTL.POSTHOG_READING_FIRST_OBSERVED)();
        }
        const page = section === "rows" ? (cursor ? `-cursor-${cursor}` : "-initial") : "";
        const key = `blog-reading-v2-${range.measurementVersion}-${period}-${range.periodEndExclusive}-${section}${page}`;
        return createCachedFetcher(key, run, CACHE_TTL.POSTHOG)();
      },
    });
    if (request.headers.get("accept") === "application/x-ndjson") {
      return streamAdminUpdates(load, HEADERS, error => { Sentry.captureException(error); });
    }
    const data = await load();
    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "읽기 분석 데이터를 불러오지 못했습니다." }, { status: 500, headers: HEADERS });
  }
}
