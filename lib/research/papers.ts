import type { ResearchPage } from "./types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RESEARCH_PAGES_SNAPSHOT } from "./generated/pages-snapshot";

/** 빌드 타임 SSG용 — snapshot 기반 (verified 페이지만 포함) */
export function getResearchPage(slug: string): ResearchPage | undefined {
  return RESEARCH_PAGES_SNAPSHOT.find((p) => p.slug === slug);
}

export function getAllResearchSlugs(): string[] {
  return RESEARCH_PAGES_SNAPSHOT.map((p) => p.slug);
}

// ─── Public (verified only) ───────────────────────────────────────────────────

/** 런타임 공개용 — verified=true인 페이지만 반환 */
export async function getResearchPageFresh(
  slug: string,
): Promise<ResearchPage | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("data")
      .eq("slug", slug)
      .eq("verified", true)
      .single();

    if (data?.data) return data.data as ResearchPage;
  } catch {
    // fallback
  }
  return getResearchPage(slug);
}

/** 런타임 공개용 — verified=true 슬러그 목록 */
export async function getAllResearchSlugsFresh(): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("slug")
      .eq("verified", true)
      .order("slug");

    if (data && data.length > 0) return data.map((r) => r.slug);
  } catch {
    // fallback
  }
  return getAllResearchSlugs();
}

// ─── Admin (all pages) ────────────────────────────────────────────────────────

/** 관리자용 — verified 상관없이 단일 페이지 조회 */
export async function getResearchPageAdmin(
  slug: string,
): Promise<{ page: ResearchPage; verified: boolean } | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("data, verified")
      .eq("slug", slug)
      .single();

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
