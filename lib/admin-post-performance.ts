import { getSupabaseAdmin } from "./supabase-admin";
import { getBlogPostUrl } from "./blog/category-slugs";
import { BASE_URL } from "./constants";
import { getTodayKST } from "./date";
import { fetchPostGA4 } from "./admin-analytics";
import { fetchPostSearch } from "./admin-search-console";
import { fetchPostReadingFirstObservedAt, fetchPostReadingSummary } from "./admin-blog-reading";
import { getPostHogEnvStatus } from "./admin-posthog";
import { isPublicPerformancePost, performanceRange, type PerformancePeriod, type PerformancePost, type PerformanceSource, type PerformanceSourceKey, type PerformanceUpdate } from "./post-performance";

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

export type CachePerformanceSource = <T>(source: PerformanceSourceKey, run: () => Promise<{ data: T; fetchedAt: string }>) => Promise<{ data: T; fetchedAt: string }>;

export async function fetchPostPerformance(
  post: PerformancePost,
  period: PerformancePeriod,
  now: Date,
  endDate: string | undefined,
  cache: CachePerformanceSource,
  emit: (update: PerformanceUpdate) => void,
  only?: PerformanceSourceKey,
  latestFinalDate?: string,
) {
  const range = performanceRange(period, now, endDate ?? latestFinalDate);
  const path = getBlogPostUrl(post.slug, post.category);
  const base = { post, path, period, range, fetchedAt: now.toISOString(), partial: false };
  emit(base);
  if (!isPublicPerformancePost(post, getTodayKST(now))) {
    const absent = { status: "not_public" as const, data: null, message: "공개 발행 후 성과를 확인할 수 있습니다." };
    emit({ search: absent, traffic: absent, reading: absent, readingFirstObserved: absent, feedback: absent });
    return;
  }
  const ph = getPostHogEnvStatus();
  const readingConfigured = ph.projectIdConfigured && ph.apiKeyConfigured && ph.baseUrlConfigured;
  const searchConfigured = Boolean(process.env.SEARCH_CONSOLE_SITE_URL?.trim());
  const searchUrl = `${BASE_URL}${path}`;
  const previousEnd = new Date(Date.parse(`${range.start}T00:00:00Z`) - 86400_000).toISOString().slice(0, 10);
  const previous = endDate ? performanceRange(period, now, previousEnd) : null;
  let partial = false;
  async function load<T>(
    key: PerformanceSourceKey,
    configured: boolean,
    label: string,
    run: () => Promise<T>,
    update: (source: PerformanceSource<T>) => PerformanceUpdate,
    complete: (data: T) => boolean = () => true,
  ) {
    if (only && only !== key) return;
    let fetchedAt: string | undefined;
    let incomplete = false;
    const source = await performanceSource(configured, label, async () => {
      let fresh: { data: T; fetchedAt: string } | undefined;
      const result = await cache(key, async () => {
        const data = await run();
        fresh = { data, fetchedAt: new Date().toISOString() };
        if (!complete(data)) throw new Error("부분 조회 실패");
        return fresh;
      }).catch(error => {
        if (fresh && !complete(fresh.data)) {
          incomplete = true;
          return fresh;
        }
        throw error;
      });
      fetchedAt = result.fetchedAt;
      return result.data;
    });
    partial ||= source.status === "error" || incomplete;
    emit({ ...update(source), sourceTimes: fetchedAt ? { [key]: fetchedAt } : undefined });
  }
  await Promise.all([
    load("search", searchConfigured, "검색", () => fetchPostSearch(searchUrl, range.start, range.end),
      search => ({ search }), data => data.queriesAvailable),
    load("traffic", Boolean(process.env.GA4_PROPERTY_ID?.trim()), "방문", () => fetchPostGA4(path, range.start, range.end),
      traffic => ({ traffic })),
    load("reading", readingConfigured, "읽기·후속 행동", async () => ({
      counts: await fetchPostReadingSummary(post.slug, period, new Date(range.anchor)),
    }), reading => ({ reading })),
    load("readingFirstObserved", readingConfigured, "읽기 수집 시작 시각", async () => ({
      firstObservedAt: await fetchPostReadingFirstObservedAt(post.slug),
    }), readingFirstObserved => ({ readingFirstObserved })),
    load("feedback", true, "누적 피드백", async () => {
      const { data, error } = await getSupabaseAdmin().rpc("get_blog_question_feedback_stats").eq("slug", post.slug).maybeSingle<{ solved: number | string; unresolved: number | string }>();
      if (error) throw error;
      const solved = Number(data?.solved ?? 0), unresolved = Number(data?.unresolved ?? 0);
      return { solved, unresolved, total: solved + unresolved };
    }, feedback => ({ feedback })),
    previous && load("previousSearch", searchConfigured, "직전 검색", () => fetchPostSearch(searchUrl, previous.start, previous.end, false),
      source => ({
        previousSearch: { start: previous.start, end: previous.end, clicks: source.data?.clicks ?? null },
        previousSearchStatus: source.status,
      })),
  ]);
  emit({ partial });
}
