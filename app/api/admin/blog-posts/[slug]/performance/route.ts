import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../../_lib/cache";
import { getPerformancePost, fetchPostPerformance } from "@/lib/admin-post-performance";
import { PERFORMANCE_PERIODS, performanceRange, type PerformancePeriod, type PostPerformance } from "@/lib/post-performance";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
class PartialPerformance extends Error {
  constructor(readonly data: PostPerformance) { super("부분 조회 실패"); }
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const { slug } = await params;
  const period = (request.nextUrl.searchParams.get("period") ?? "30d") as PerformancePeriod;
  if (!/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug) || !PERFORMANCE_PERIODS.includes(period)) {
    return Response.json({ message: "글 또는 기간이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const post = await getPerformancePost(slug);
    if (!post) return Response.json({ message: "글을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });
    const now = new Date();
    const range = performanceRange(period, now);
    const fetcher = createCachedFetcher(`post-performance-v1-${slug}-${post.updatedAt}-${period}-${range.end}`, async () => {
      const result = await fetchPostPerformance(post, period, now);
      if (result.partial) throw new PartialPerformance(result);
      return result;
    }, CACHE_TTL.POSTHOG);
    let data: PostPerformance;
    try { data = await fetcher(); }
    catch (error) { if (error instanceof PartialPerformance) data = error.data; else throw error; }
    return Response.json({ data }, { headers: HEADERS });
  } catch {
    return Response.json({ message: "포스트 성과를 불러오지 못했습니다." }, { status: 503, headers: HEADERS });
  }
}
