import { cache } from "react";
import type { ResearchPage } from "./types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RESEARCH_PAGES_SNAPSHOT } from "./generated/pages-snapshot";

type ResearchHubPage = Pick<ResearchPage,
  "slug" | "title" | "category" | "description" | "hubSummary" |
  "hubHighlightStat" | "hubHighlightLabel" | "hubHighlightContext" | "papers"
>;

const HUB_COLUMNS = "verified, slug:data->>slug, title:data->>title, category:data->>category, description:data->>description, hubSummary:data->>hubSummary, hubHighlightStat:data->>hubHighlightStat, hubHighlightLabel:data->>hubHighlightLabel, hubHighlightContext:data->>hubHighlightContext, papers:data->papers";
type ResearchHubRow = ResearchHubPage & { verified: boolean };

/** 빌드 타임 SSG용 — snapshot 기반 (verified 페이지만 포함) */
export function getResearchPage(slug: string): ResearchPage | undefined {
  return RESEARCH_PAGES_SNAPSHOT.find((p) => p.slug === slug);
}

export function getAllResearchSlugs(): string[] {
  return RESEARCH_PAGES_SNAPSHOT.map((p) => p.slug);
}

// ─── Public (verified only) ───────────────────────────────────────────────────

// React cache is scoped to a server render, not shared across requests. Metadata
// and the page body reuse the same live row without delaying publication changes.
const getResearchRowForRequest = cache(async (slug: string) => {
  const { data, error } = await getSupabaseAdmin()
    .from("research_pages")
    .select("data, verified")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as { data: ResearchPage; verified: boolean } | null;
});

/** Public hub: one live query instead of a slug query followed by N detail reads. */
export async function getAllResearchPagesFresh(): Promise<ResearchHubPage[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("research_pages")
      .select(HUB_COLUMNS)
      .eq("verified", true)
      .not("data", "is", null)
      .order("slug")
      .overrideTypes<ResearchHubRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? [])
      .flatMap(({ verified, ...page }) => verified === true ? [page] : []);
  } catch {
    throw new Error("연구 자료 목록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/** Admin hub: retain live verification state and the existing admin-only fallback. */
export async function getAllResearchPagesAdmin(): Promise<Array<{ page: ResearchHubPage; verified: boolean }>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("research_pages")
      .select(HUB_COLUMNS)
      .not("data", "is", null)
      .order("slug")
      .overrideTypes<ResearchHubRow[], { merge: false }>();
    if (error) throw error;
    if (data?.length) {
      return data.map(({ verified, ...page }) => ({
        page,
        verified: verified === true,
      }));
    }
  } catch {
    // Snapshot fallback is for authenticated admin screens only.
  }
  return RESEARCH_PAGES_SNAPSHOT.map((page) => ({ page, verified: false }));
}

/** 런타임 공개용 — verified=true인 페이지만 반환 */
export async function getResearchPageFresh(
  slug: string,
): Promise<ResearchPage | undefined> {
  try {
    const data = await getResearchRowForRequest(slug);
    return data?.verified === true ? data.data as ResearchPage : undefined;
  } catch {
    throw new Error("연구 자료의 공개 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/** 런타임 공개용 — verified=true 슬러그 목록 */
export async function getAllResearchSlugsFresh(): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("research_pages")
      .select("slug")
      .eq("verified", true)
      .order("slug");

    if (error) throw error;
    return (data ?? []).map((r) => r.slug);
  } catch {
    throw new Error("연구 자료 목록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/** Resolve the live public status of research pages referenced by a blog post. */
export async function getPublicResearchSlugsFresh(slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();

  const { data, error } = await getSupabaseAdmin()
    .from("research_pages")
    .select("slug")
    .eq("verified", true)
    .not("data", "is", null)
    .in("slug", slugs);

  if (error) throw error;
  return new Set(data.map((row) => row.slug));
}

// ─── Admin (all pages) ────────────────────────────────────────────────────────

/** 관리자용 — verified 상관없이 단일 페이지 조회 */
export async function getResearchPageAdmin(
  slug: string,
): Promise<{ page: ResearchPage; verified: boolean } | undefined> {
  try {
    const data = await getResearchRowForRequest(slug);

    if (data?.data) {
      return { page: data.data as ResearchPage, verified: data.verified ?? false };
    }
  } catch {
    // fallback
  }
  const page = getResearchPage(slug);
  if (page) return { page, verified: false };
  return undefined;
}

/** 관리자용 — 전체 슬러그 + verified 상태 */
export async function getAllResearchSlugsAdmin(): Promise<
  Array<{ slug: string; verified: boolean }>
> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("slug, verified")
      .order("slug");

    if (data && data.length > 0) {
      return data.map((r) => ({ slug: r.slug, verified: r.verified ?? false }));
    }
  } catch {
    // fallback
  }
  return getAllResearchSlugs().map((slug) => ({ slug, verified: false }));
}

