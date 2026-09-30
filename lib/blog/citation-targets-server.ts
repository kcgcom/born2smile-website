import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ResearchPage } from "@/lib/research/types";
import type { BlogBlock } from "./types";
import { filterPublicCitationTargets, getCitationResearchSlugs, getCitationTargetIssues, type CitationResearchTarget } from "./citation-targets";

export class CitationResearchUnavailableError extends Error {
  constructor() {
    super("연구 자료의 상태를 확인하지 못했습니다. 잠시 후 다시 저장해 주세요.");
  }
}

async function loadTargets(blocks: BlogBlock[]): Promise<Map<string, CitationResearchTarget>> {
  const slugs = getCitationResearchSlugs(blocks);
  if (!slugs.length) return new Map();
  const { data, error } = await getSupabaseAdmin().from("research_pages")
    .select("slug, data, verified").in("slug", slugs);
  if (error) throw new CitationResearchUnavailableError();
  return new Map((data ?? []).map((row: { slug: string; data: ResearchPage | null; verified: boolean }) => [
    row.slug, {
      verified: row.verified === true,
      paperIds: Array.isArray(row.data?.papers) ? row.data.papers.filter((paper) => typeof paper?.id === "string").map((paper) => paper.id) : [],
    },
  ]));
}

export async function validateBlogCitationTargets(blocks: BlogBlock[], requirePublished: boolean) {
  // Writes must be checked against live data. A snapshot must not approve a stale reference.
  let targets;
  try { targets = await loadTargets(blocks); }
  catch { throw new CitationResearchUnavailableError(); }
  return getCitationTargetIssues(blocks, targets, requirePublished);
}

export async function filterPublicBlogCitations(blocks: BlogBlock[]) {
  if (!getCitationResearchSlugs(blocks).length) return blocks;
  let targets: Map<string, CitationResearchTarget>;
  try { targets = await loadTargets(blocks); }
  catch {
    // Publication can change after a snapshot was built. Keep the blog body,
    // but don't display research whose current public status is unknown.
    targets = new Map();
  }
  return filterPublicCitationTargets(blocks, targets);
}
