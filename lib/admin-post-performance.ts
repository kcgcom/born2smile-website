import { getSupabaseAdmin } from "./supabase-admin";
import { getBlogPostUrl } from "./blog/category-slugs";
import { BASE_URL } from "./constants";
import { getTodayKST } from "./date";
import { fetchPostGA4 } from "./admin-analytics";
import { fetchPostSearch } from "./admin-search-console";
import { fetchBlogReading } from "./admin-blog-reading";
import { getPostHogEnvStatus } from "./admin-posthog";
import { isPublicPerformancePost, performanceRange, type PerformancePeriod, type PerformancePost, type PerformanceSource, type PostPerformance } from "./post-performance";

export async function getPerformancePost(slug: string): Promise<PerformancePost | null> {
  const { data, error } = await getSupabaseAdmin().from("blog_posts")
    .select("slug,title,category,date,date_modified,published,updated_at").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? { slug: data.slug, title: data.title, category: data.category, date: data.date,
    dateModified: data.date_modified, published: data.published, updatedAt: data.updated_at } : null;
}

export async function performanceSource<T>(configured: boolean, label: string, run: () => Promise<T>): Promise<PerformanceSource<T>> {
  if (!configured) return { status: "unconfigured", data: null, message: `${label} 연결 설정이 필요합니다.` };
  try { return { status: "ready", data: await run() }; }
  catch { return { status: "error", data: null, message: `${label} 데이터를 불러오지 못했습니다.` }; }
}

export async function fetchPostPerformance(post: PerformancePost, period: PerformancePeriod, now = new Date()): Promise<PostPerformance> {
  const range = performanceRange(period, now);
  const path = getBlogPostUrl(post.slug, post.category);
  const base = { post, path, period, range, fetchedAt: now.toISOString(), partial: false };
  if (!isPublicPerformancePost(post, getTodayKST(now))) {
    const absent = { status: "not_public" as const, data: null, message: "공개 발행 후 성과를 확인할 수 있습니다." };
    return { ...base, search: absent, traffic: absent, reading: absent, feedback: absent };
  }
  const ph = getPostHogEnvStatus();
  const [search, traffic, reading, feedback] = await Promise.all([
    performanceSource(Boolean(process.env.SEARCH_CONSOLE_SITE_URL?.trim()), "검색", () => fetchPostSearch(`${BASE_URL}${path}`, range.start, range.end)),
    performanceSource(Boolean(process.env.GA4_PROPERTY_ID?.trim()), "방문", () => fetchPostGA4(path, range.start, range.end)),
    performanceSource(ph.projectIdConfigured && ph.apiKeyConfigured && ph.baseUrlConfigured, "읽기·후속 행동", async () => {
      const report = await fetchBlogReading(period, null, { slug: post.slug, now: new Date(range.anchor) });
      return { counts: report.summary, firstObservedAt: report.meta.firstObservedAt, warnings: report.warnings };
    }),
    performanceSource(true, "누적 피드백", async () => {
      const { data, error } = await getSupabaseAdmin().rpc("get_blog_question_feedback_stats").eq("slug", post.slug).maybeSingle<{ solved: number | string; unresolved: number | string }>();
      if (error) throw error;
      const solved = Number(data?.solved ?? 0), unresolved = Number(data?.unresolved ?? 0);
      return { solved, unresolved, total: solved + unresolved };
    }),
  ]);
  const partial = [search, traffic, reading, feedback].some(source => source.status === "error")
    || (search.status === "ready" && !search.data.queriesAvailable)
    || (reading.status === "ready" && reading.data.warnings.length > 0);
  return { ...base, partial, search, traffic, reading, feedback };
}
