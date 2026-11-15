import { createHash } from "node:crypto";
import { BASE_URL } from "../../lib/constants";
import { TREATMENT_CATEGORY_MAP } from "../../lib/blog";
import { isBlogCategorySlug, normalizeBlogCategory } from "../../lib/blog/category-slugs";
import { TREATMENT_DETAILS } from "../../lib/treatments";
import { getTodayKST } from "../../lib/date";

export const PERIODS = ["7d", "30d", "90d", "180d"] as const;
export type Period = typeof PERIODS[number];
type JsonObject = Record<string, unknown>;
export interface Source {
  status: "ready" | "partial" | "unconfigured" | "error" | "skipped";
  endpoint: string;
  retrievedAt: string;
  scope: "site" | "post";
  requestedPeriod: Period | null;
  effectivePeriod: string | null;
  freshness: "provider-metadata" | "unverified-may-fallback" | "database-live";
  data: unknown;
  error?: string;
}

export function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const production = url.origin === new URL(BASE_URL).origin;
  if ((!local && !production) || !["http:", "https:"].includes(url.protocol)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("API 주소는 로컬 서버 또는 공식 사이트의 origin만 허용합니다.");
  }
  return url.origin;
}

export function parseTarget(path: string) {
  const treatment = /^\/treatments\/([a-z-]+)$/.exec(path);
  if (treatment && Object.hasOwn(TREATMENT_DETAILS, treatment[1])) {
    return { kind: "treatment" as const, path, category: TREATMENT_CATEGORY_MAP[treatment[1]], slug: null,
      localContent: TREATMENT_DETAILS[treatment[1]], sourceFiles: ["lib/treatments.ts", "app/treatments/[slug]/page.tsx"] };
  }
  const blog = /^\/blog\/([a-z-]+)\/([a-z0-9][a-z0-9-]{0,200}[a-z0-9])$/.exec(path);
  if (blog && isBlogCategorySlug(blog[1])) {
    return { kind: "blog" as const, path, category: normalizeBlogCategory(blog[1])!, slug: blog[2],
      localContent: null, sourceFiles: [] as string[] };
  }
  throw new Error("대상은 /treatments/{진료ID} 또는 /blog/{카테고리}/{slug}여야 합니다.");
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createReader(baseUrl: string, token: string | undefined, fetcher: typeof fetch = fetch, offline = false) {
  const origin = validateBaseUrl(baseUrl);
  return async (endpoint: string, period: Period | null = null, scope: Source["scope"] = "site", effectivePeriod: string | null = period): Promise<Source> => {
    // Keep the credential inside a fixed GET-only API allowlist.
    if (!/^\/api\/admin\/(?:blog-posts(?:\/[a-z0-9-]+(?:\/(?:performance|source))?)?|blog-feedback|search-console|analytics|content-planner|naver-datalab\/trend-summary)(?:\?[^#]*)?$/.test(endpoint)) {
      throw new Error("허용되지 않은 조회 경로입니다.");
    }
    const base = { endpoint, retrievedAt: new Date().toISOString(), scope, requestedPeriod: period, effectivePeriod,
      freshness: endpoint.startsWith("/api/admin/blog-posts") && !/^\/api\/admin\/blog-posts\/[a-z0-9-]+\/performance(?:\?|$)/.test(endpoint)
        ? "unverified-may-fallback" as const : "provider-metadata" as const, data: null };
    if (offline) return { ...base, status: "skipped", error: "OFFLINE" };
    if (!token) return { ...base, status: "unconfigured", error: "AGENT_CONTENT_SECRET_MISSING" };
    try {
      const response = await fetcher(`${origin}${endpoint}`, { method: "GET", redirect: "error",
        signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      if (!response.ok) return { ...base, status: "error", error: `HTTP_${response.status}` };
      const payload: unknown = await response.json();
      if (!object(payload) || !("data" in payload)) return { ...base, status: "error", error: "INVALID_RESPONSE" };
      const data = payload.data;
      if (data === null || (object(data) && data.configured === false)) return { ...base, status: "unconfigured" };
      if (endpoint.endsWith("/source")) {
        if (!object(data) || data.source !== "supabase" || typeof data.revision !== "string" || !/^[a-f0-9-]{36}$/.test(data.revision) || typeof data.updatedAt !== "string") return { ...base, status: "error", error: "INVALID_SOURCE_VERSION" };
        return { ...base, data, freshness: "database-live", status: "ready" };
      }
      const partial = object(data) && (data.partial === true || (object(data.meta) && data.meta.partial === true));
      return { ...base, data, status: partial ? "partial" : "ready" };
    } catch {
      // Never serialize provider errors, response bodies, or credentials.
      return { ...base, status: "error", error: "REQUEST_FAILED" };
    }
  };
}

export async function collectContext(options: { target: string; period: Period; limit: number; baseUrl: string; token?: string; offline?: boolean; fetcher?: typeof fetch }) {
  const target = parseTarget(options.target);
  if (!PERIODS.includes(options.period) || !Number.isInteger(options.limit) || options.limit < 1 || options.limit > 20) throw new Error("기간 또는 관련 글 수가 올바르지 않습니다.");
  const read = createReader(options.baseUrl, options.token, options.fetcher, options.offline);
  const searchPeriod = options.period === "30d" ? "28d" : options.period;
  const [catalog, search, traffic, feedback, planner, demand] = await Promise.all([
    read("/api/admin/blog-posts"),
    read(`/api/admin/search-console?period=${searchPeriod}&includeClusters=false`, options.period, "site", searchPeriod),
    read(`/api/admin/analytics?period=${options.period}&scope=basic`, options.period),
    read("/api/admin/blog-feedback"),
    read("/api/admin/content-planner"),
    read("/api/admin/naver-datalab/trend-summary?mode=volume&period=3m&detail=short", null, "site", "monthly-volume-snapshot"),
  ]);
  if (catalog.status === "ready" && (!Array.isArray(catalog.data) || !catalog.data.every(item => object(item) && typeof item.slug === "string" && typeof item.category === "string" && typeof item.date === "string" && typeof item.published === "boolean"))) {
    catalog.status = "error"; catalog.data = null; catalog.error = "INVALID_CATALOG";
  }
  const posts = Array.isArray(catalog.data) ? catalog.data.filter(object) : [];
  const publicPosts = posts.filter(post => post.published === true && String(post.date) <= getTodayKST());
  const candidates = publicPosts.filter(post => normalizeBlogCategory(String(post.category)) === target.category)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug)));
  const selected = candidates.filter(post => post.slug !== target.slug).slice(0, options.limit);
  const slugs = [...new Set([...(target.slug ? [target.slug] : []), ...selected.map(post => String(post.slug))])];
  const content = [];
  // Bound concurrency and API cost; stop at the explicit related-post limit.
  for (const slug of slugs) {
    if (!/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug)) continue;
    const source = await read(`/api/admin/blog-posts/${slug}/source`, null, "post");
    const performance = await read(`/api/admin/blog-posts/${slug}/performance?period=${options.period}`, options.period, "post");
    content.push({ slug, contentHash: source.data ? contentHash(source.data) : null, source, performance });
  }
  // Exclude actor email and opaque snapshots from the exported task records.
  if (Array.isArray(planner.data)) planner.data = planner.data.filter(object).filter(item => item.targetPage === target.path || item.category === target.category).map(item => ({
    id: item.id, title: item.title, itemType: item.itemType, status: item.status, targetPage: item.targetPage,
    rationale: item.rationale, brief: item.brief, updatedAt: item.updatedAt,
  }));
  const sources = { catalog, search, traffic, feedback, planner, demand };
  const allSources = [...Object.values(sources), ...content.flatMap(item => [item.source, item.performance])];
  return {
    schemaVersion: "agent-context-v1", generatedAt: new Date().toISOString(), timezone: "Asia/Seoul", apiOrigin: validateBaseUrl(options.baseUrl),
    target, period: options.period, partial: allSources.some(source => source.status !== "ready"),
    selection: { method: "same-category-newest", candidateCount: candidates.length, selectedCount: selected.length, limit: options.limit, truncated: candidates.filter(post => post.slug !== target.slug).length > selected.length },
    sources, content,
    warnings: [
      "진료 페이지는 로컬 작업 트리의 데이터입니다. 공개 사이트와 일치하는지는 별도 확인해야 합니다.",
      "블로그 목록은 snapshot으로 폴백할 수 있습니다. 본문은 /source에서 최신 DB 버전을 조회하며 실패 시 대체하지 않습니다. 수정안에는 contentHash가 아닌 source.data.revision을 사용하세요.",
      "사이트 전체 지표를 대상 페이지의 성과로 해석하지 마세요. 각 응답의 기간·표본·부분 실패 메타데이터를 확인하세요.",
      "피드백은 누적 선택 응답이며 어떤 내용이 부족한지를 직접 설명하지 않습니다.",
    ],
  };
}
