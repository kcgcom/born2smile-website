import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../../_lib/cache";
import { streamAdminUpdates } from "../../../_lib/stream";
import { getLatestFinalSearchDate } from "../../../_lib/search-console-cache";
import { getPerformancePost, fetchPostPerformance } from "@/lib/admin-post-performance";
import { getTodayKST } from "@/lib/date";
import { READING_VERSION } from "@/lib/blog/reading";
import { isPublicPerformancePost, PERFORMANCE_PERIODS, PERFORMANCE_SOURCES, performanceRange, validPerformanceEnd, type PerformancePeriod, type PerformanceSourceKey, type PerformanceUpdate } from "@/lib/post-performance";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const { slug } = await params;
  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as PerformancePeriod;
  const endDate = request.nextUrl.searchParams.get("end");
  const source = request.nextUrl.searchParams.get("source") as PerformanceSourceKey | null;
  const now = new Date();
  if (!/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug) || !PERFORMANCE_PERIODS.includes(period)
    || (endDate !== null && !validPerformanceEnd(endDate, now))
    || (source !== null && (!PERFORMANCE_SOURCES.includes(source) || (source === "previousSearch" && !endDate)))) {
    return Response.json({ message: "글 또는 기간이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const post = await getPerformancePost(slug);
    if (!post) return Response.json({ message: "글을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });
    const load = async (emit: (update: PerformanceUpdate) => void) => {
      const latest = !endDate && isPublicPerformancePost(post, getTodayKST(now)) && process.env.SEARCH_CONSOLE_SITE_URL?.trim()
        ? await getLatestFinalSearchDate(now).catch(() => undefined)
        : undefined;
      const range = performanceRange(period, now, endDate ?? latest);
      await fetchPostPerformance(
        post, period, now, endDate ?? undefined,
        (key, run) => {
          if (key === "readingFirstObserved") {
            return createCachedFetcher(`post-reading-first-${READING_VERSION}-${slug}`, run, CACHE_TTL.POSTHOG_READING_FIRST_OBSERVED)();
          }
          const scope = key === "feedback" ? "" : `-${period}-${range.end}`;
          const version = key === "reading" ? "v4" : "v3";
          return createCachedFetcher(`post-performance-${version}-${slug}-${post.updatedAt}-${key}${scope}`, run, CACHE_TTL.POSTHOG)();
        },
        emit, source ?? undefined, latest,
      );
    };
    if (request.headers.get("accept") === "application/x-ndjson") {
      return streamAdminUpdates(load, HEADERS);
    }
    const data: PerformanceUpdate = {};
    await load(update => {
      const sourceTimes = { ...data.sourceTimes, ...update.sourceTimes };
      Object.assign(data, update, { sourceTimes });
    });
    if (data.reading?.status === "ready") {
      data.reading = {
        ...data.reading,
        data: {
          ...data.reading.data,
          firstObservedAt: data.readingFirstObserved?.data?.firstObservedAt ?? null,
          warnings: data.readingFirstObserved?.status === "error" ? ["수집 시작 시각을 확인하지 못했습니다."] : [],
        },
      };
    }
    return Response.json({ data }, { headers: HEADERS });
  } catch {
    return Response.json({ message: "포스트 성과를 불러오지 못했습니다." }, { status: 503, headers: HEADERS });
  }
}
