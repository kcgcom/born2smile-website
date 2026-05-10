import type { ResearchPage } from "./types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RESEARCH_PAGES_SNAPSHOT } from "./generated/pages-snapshot";

/** 빌드 타임 SSG용 — snapshot 기반 */
export function getResearchPage(slug: string): ResearchPage | undefined {
  return RESEARCH_PAGES_SNAPSHOT.find((p) => p.slug === slug);
}

export function getAllResearchSlugs(): string[] {
  return RESEARCH_PAGES_SNAPSHOT.map((p) => p.slug);
}

/** 런타임용 — Supabase 우선, snapshot fallback */
export async function getResearchPageFresh(
  slug: string,
): Promise<ResearchPage | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("data")
      .eq("slug", slug)
      .single();

    if (data?.data) return data.data as ResearchPage;
  } catch {
    // fallback
  }
  return getResearchPage(slug);
}

export async function getAllResearchSlugsFresh(): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("research_pages")
      .select("slug")
      .order("slug");

    if (data && data.length > 0) return data.map((r) => r.slug);
  } catch {
    // fallback
  }
  return getAllResearchSlugs();
}
