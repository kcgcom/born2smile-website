import { BASE_URL } from "./constants";
import { getCategorySlug } from "./blog";
import type { BlogCategoryValue } from "./blog";
import { getSupabaseAdmin } from "./supabase-admin";
import { getTodayKST } from "./date";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export type IndexNowSource = "scheduled" | "post_publish" | "post_update" | "revision_apply";
type IndexNowStatus = "accepted" | "pending_validation" | "no_urls" | "missing_key" | "failed";
type IndexNowResult = { status: IndexNowStatus; url_count: number; http_status: number | null };
export type IndexNowRun = IndexNowResult & { source: IndexNowSource; started_at: string; ran_at: string };
export type IndexNowHistory = {
  storageReady: boolean;
  latest: IndexNowRun | null;
  latestAccepted: IndexNowRun | null;
  post?: { updatedAt: string; needsSubmission: boolean } | null;
};

const TABLE = "indexnow_submission_state";
type StoredIndexNowState = { latest: IndexNowRun; latest_accepted: IndexNowRun | null };

async function submitIndexNowUrls(urls: string[]): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY?.trim();
  const url_count = urls.length;
  if (!url_count) return { status: "no_urls", url_count, http_status: null };
  if (!key) return { status: "missing_key", url_count, http_status: null };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(BASE_URL).host,
        key,
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList: urls,
      }),
    });
    const status = response.status === 200 ? "accepted"
      : response.status === 202 ? "pending_validation" : "failed";
    return { status, url_count, http_status: response.status };
  } catch {
    return { status: "failed", url_count, http_status: null };
  }
}

export async function runIndexNowSubmission(
  source: IndexNowSource,
  urls: string[],
  postSlugs: string[],
): Promise<IndexNowRun> {
  const started_at = new Date().toISOString();
  const submission = await submitIndexNowUrls([...new Set(urls)]);
  const result = { source, started_at, ran_at: new Date().toISOString(), ...submission };
  if (result.status === "failed" || result.status === "missing_key") {
    console.warn("[indexnow] submission unsuccessful", result);
  }
  try {
    const { error } = await getSupabaseAdmin().rpc("record_indexnow_submission", {
      p_slugs: postSlugs,
      p_run: result,
    });
    if (error) console.error("[indexnow] could not record submission", { code: error.code, ...result });
  } catch {
    console.error("[indexnow] could not record submission", result);
  }
  return result;
}

export async function getIndexNowHistory(slug?: string): Promise<IndexNowHistory> {
  const { data, error } = await getSupabaseAdmin().from(TABLE)
    .select("latest, latest_accepted")
    .eq("scope", slug ? `post:${slug}` : "site")
    .maybeSingle<StoredIndexNowState>();
  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return { storageReady: false, latest: null, latestAccepted: null };
  }
  if (error) throw error;
  const latestAccepted = data?.latest_accepted ?? null;
  if (!slug) return { storageReady: true, latest: data?.latest ?? null, latestAccepted };

  const { data: post, error: postError } = await getSupabaseAdmin().from("blog_posts")
    .select("updated_at")
    .eq("slug", slug)
    .eq("published", true)
    .lte("date", getTodayKST())
    .maybeSingle<{ updated_at: string }>();
  if (postError) throw postError;
  return {
    storageReady: true,
    latest: null,
    latestAccepted,
    post: post ? {
      updatedAt: post.updated_at,
      needsSubmission: !latestAccepted || Date.parse(post.updated_at) > Date.parse(latestAccepted.started_at),
    } : null,
  };
}

export async function submitBlogPostToIndexNow(
  slug: string,
  category: BlogCategoryValue,
  source: Exclude<IndexNowSource, "scheduled">,
): Promise<void> {
  const categorySlug = getCategorySlug(category);
  await runIndexNowSubmission(source, [
    `${BASE_URL}/blog/${categorySlug}/${slug}`,
    `${BASE_URL}/blog`,
    `${BASE_URL}/sitemap.xml`,
  ], [slug]);
}
