import { z } from "zod/v4";
import {
  CATEGORY_KEYWORDS,
  KEYWORD_CATEGORY_SLUGS,
  type CategoryKeywords,
  type KeywordCategorySlug,
} from "@/lib/admin-naver-datalab-keywords";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  GENERATED_KEYWORD_TAXONOMY,
  GENERATED_KEYWORD_TAXONOMY_VERSION,
} from "@/lib/keyword-taxonomy/generated/active-snapshot";
import { isRelevantRelatedKeyword } from "@/lib/admin-naver-datalab-keywords";
import type { SearchAdKeywordData } from "@/lib/admin-naver-searchad";

const topicAngleSchema = z.object({
  template: z.string().min(1),
  subGroup: z.string().min(1),
  aspect: z.string(),
});

const subGroupSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(2).max(20),
  searchIntent: z.enum(["informational", "commercial", "transactional", "navigational"]),
});

const categorySchema = z.object({
  category: z.enum(KEYWORD_CATEGORY_SLUGS),
  slug: z.enum(KEYWORD_CATEGORY_SLUGS),
  subGroups: z.array(subGroupSchema).min(1).max(15),
  topicAngles: z.array(topicAngleSchema),
});

const taxonomySchema = z.array(categorySchema).min(1);

export interface ActiveKeywordTaxonomy {
  id: string | null;
  version: number | null;
  source: "supabase" | "code-fallback";
  taxonomy: CategoryKeywords[];
  createdAt: string | null;
}

export interface KeywordTaxonomyState {
  active: ActiveKeywordTaxonomy;
  pending: ActiveKeywordTaxonomy | null;
}

export interface KeywordTaxonomyCandidate {
  id: string;
  keyword: string;
  monthlyVolume: number;
  suggestedCategory: KeywordCategorySlug;
  suggestedSubgroup: string;
  status: "pending" | "approved" | "deferred" | "rejected";
  reason: string;
  createdAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
}

export interface KeywordTaxonomyVersionSummary {
  version: number;
  status: "pending" | "active" | "archived";
  changeSummary: string;
  createdBy: string;
  createdAt: string;
}

export interface KeywordTaxonomyDiff {
  addedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
  removedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
  addedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
  removedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
}

export function validateKeywordTaxonomy(value: unknown): CategoryKeywords[] {
  const taxonomy = taxonomySchema.parse(value) as CategoryKeywords[];
  for (const category of taxonomy) {
    if (category.category !== category.slug) {
      throw new Error(`${category.slug}: category와 slug가 일치해야 합니다.`);
    }
    for (const group of category.subGroups) {
      const seenKeywords = new Set<string>();
      for (const keyword of group.keywords) {
        const normalized = normalizeTaxonomyKeyword(keyword);
        if (seenKeywords.has(normalized)) throw new Error(`키워드 중복: ${category.slug}/${group.name}/${keyword}`);
        seenKeywords.add(normalized);
      }
      if (!category.topicAngles.some((angle) => angle.subGroup === group.name)) {
        throw new Error(`${category.slug}/${group.name}: 주제 템플릿이 없습니다.`);
      }
    }
  }
  return taxonomy;
}

export async function getActiveKeywordTaxonomy(): Promise<ActiveKeywordTaxonomy> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("keyword_taxonomy_versions")
      .select("id,version,taxonomy,created_at")
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      if (error.code === "42P01") return codeFallback();
      throw error;
    }
    if (!data) return codeFallback();
    return {
      id: data.id,
      version: data.version,
      source: "supabase",
      taxonomy: validateKeywordTaxonomy(data.taxonomy),
      createdAt: data.created_at,
    };
  } catch {
    return codeFallback();
  }
}

export async function activateKeywordTaxonomy(
  taxonomy: unknown,
  createdBy: string,
  summary: string,
): Promise<string> {
  const validated = validateKeywordTaxonomy(taxonomy);
  const { data, error } = await getSupabaseAdmin().rpc("activate_keyword_taxonomy", {
    p_taxonomy: validated,
    p_created_by: createdBy,
    p_change_summary: summary,
  });
  if (error) throw error;
  return data as string;
}

export async function getKeywordTaxonomyState(): Promise<KeywordTaxonomyState> {
  const active = await getActiveKeywordTaxonomy();
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("keyword_taxonomy_versions")
      .select("id,version,taxonomy,created_at")
      .eq("status", "pending")
      .maybeSingle();
    if (error) throw error;
    return {
      active,
      pending: data ? {
        id: data.id,
        version: data.version,
        source: "supabase",
        taxonomy: validateKeywordTaxonomy(data.taxonomy),
        createdAt: data.created_at,
      } : null,
    };
  } catch {
    return { active, pending: null };
  }
}

export async function getKeywordTaxonomyByVersion(version: number): Promise<ActiveKeywordTaxonomy> {
  const { data, error } = await getSupabaseAdmin()
    .from("keyword_taxonomy_versions")
    .select("id,version,taxonomy,created_at")
    .eq("version", version)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    version: data.version,
    source: "supabase",
    taxonomy: validateKeywordTaxonomy(data.taxonomy),
    createdAt: data.created_at,
  };
}

async function savePendingKeywordTaxonomy(
  taxonomy: CategoryKeywords[],
  createdBy: string,
  _summary: string,
  candidateIds: string[],
): Promise<number> {
  const validated = validateKeywordTaxonomy(taxonomy);
  // 활성 택소노미 대비 diff 기반으로 요약 자동 생성
  const active = await getActiveKeywordTaxonomy();
  const diff = diffTaxonomies(active.taxonomy, taxonomy);
  const parts: string[] = [];
  if (diff.addedKeywords.length) parts.push(`키워드 +${diff.addedKeywords.length}`);
  if (diff.removedKeywords.length) parts.push(`키워드 -${diff.removedKeywords.length}`);
  if (diff.addedSubgroups.length) parts.push(`서브그룹 +${diff.addedSubgroups.length}`);
  if (diff.removedSubgroups.length) parts.push(`서브그룹 -${diff.removedSubgroups.length}`);
  const summary = parts.length > 0 ? `활성 대비: ${parts.join(", ")}` : "변경 없음";

  const { data, error } = await getSupabaseAdmin().rpc("save_pending_keyword_taxonomy", {
    p_taxonomy: validated,
    p_created_by: createdBy,
    p_change_summary: summary,
    p_candidate_ids: candidateIds,
  });
  if (error) throw error;
  return data as number;
}

export async function initializeKeywordTaxonomy(createdBy: string): Promise<ActiveKeywordTaxonomy> {
  const current = await getActiveKeywordTaxonomy();
  if (current.source === "supabase") return current;
  await activateKeywordTaxonomy(CATEGORY_KEYWORDS, createdBy, "코드 택소노미 초기 이관");
  return getActiveKeywordTaxonomy();
}

export async function refreshKeywordTaxonomyCandidates(): Promise<number> {
  const [{ taxonomy }, snapshot] = await Promise.all([
    getActiveKeywordTaxonomy(),
    getCandidateSourceSnapshot(),
  ]);
  if (!snapshot) return 0;

  const existing = new Set(taxonomy.flatMap((category) =>
    category.subGroups.flatMap((group) => group.keywords.map(normalizeTaxonomyKeyword)),
  ));
  const targets = taxonomy.flatMap((category) => category.subGroups.map((group) => ({
    category: category.slug,
    subgroup: group.name,
    keywords: group.keywords.map(normalizeTaxonomyKeyword),
  })));

  const matchedCandidates = snapshot.data
    .filter((item) => item.isRelated && item.monthlyTotalQcCnt > 0 && isRelevantRelatedKeyword(item.keyword))
    .filter((item) => !existing.has(normalizeTaxonomyKeyword(item.keyword)))
    .map((item) => {
      const normalized = normalizeTaxonomyKeyword(item.keyword);
      let best: (typeof targets)[number] | null = null;
      let bestScore = 0;
      for (const target of targets) {
        for (const core of target.keywords) {
          if (!normalized.includes(core) || normalized === core) continue;
          const score = core.length / normalized.length;
          if (score > bestScore) {
            best = target;
            bestScore = score;
          }
        }
      }
      return best && bestScore >= 0.35
        ? {
            keyword: item.keyword,
            normalized_keyword: normalized,
            monthly_volume: item.monthlyTotalQcCnt,
            suggested_category: best.category,
            suggested_subgroup: best.subgroup,
            reason: `${best.subgroup} 핵심 키워드와 표현이 겹치며 월 ${item.monthlyTotalQcCnt.toLocaleString("ko-KR")}회 검색됩니다.`,
            source_snapshot_id: snapshot.id,
            updated_at: new Date().toISOString(),
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .filter((item) => item.monthly_volume >= 100)
    .sort((a, b) => b.monthly_volume - a.monthly_volume);

  const perSubgroupCount = new Map<string, number>();
  const candidates = matchedCandidates.filter((candidate) => {
    const key = `${candidate.suggested_category}:${candidate.suggested_subgroup}`;
    const count = perSubgroupCount.get(key) ?? 0;
    if (count >= 5) return false;
    perSubgroupCount.set(key, count + 1);
    return true;
  });

  if (candidates.length === 0) return 0;
  const { error } = await getSupabaseAdmin().rpc("refresh_keyword_taxonomy_candidates", {
    p_candidates: candidates.map(({ keyword, normalized_keyword, monthly_volume, suggested_category, suggested_subgroup, reason }) => ({
      keyword,
      normalized_keyword,
      monthly_volume,
      suggested_category,
      suggested_subgroup,
      reason,
    })),
    p_snapshot_id: snapshot.id,
  });
  if (error) throw error;
  return candidates.length;
}

async function getCandidateSourceSnapshot(): Promise<{ id: string; data: SearchAdKeywordData[] } | null> {
  const admin = getSupabaseAdmin();
  const { data: pointer, error: pointerError } = await admin
    .from("searchad_snapshot_pointer")
    .select("snapshot_id")
    .eq("singleton", true)
    .maybeSingle();
  if (pointerError) throw pointerError;
  if (!pointer?.snapshot_id) return null;
  const { data, error } = await admin
    .from("searchad_snapshots")
    .select("id,data")
    .eq("id", pointer.snapshot_id)
    .single();
  if (error) throw error;
  return Array.isArray(data.data) ? { id: data.id, data: data.data as SearchAdKeywordData[] } : null;
}

export async function listKeywordTaxonomyCandidates(): Promise<KeywordTaxonomyCandidate[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("keyword_taxonomy_candidates")
    .select("id,keyword,monthly_volume,suggested_category,suggested_subgroup,status,reason,created_at,first_seen_at,last_seen_at,seen_count")
    .order("seen_count", { ascending: false })
    .order("monthly_volume", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    keyword: row.keyword,
    monthlyVolume: row.monthly_volume,
    suggestedCategory: row.suggested_category as KeywordCategorySlug,
    suggestedSubgroup: row.suggested_subgroup ?? "",
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    seenCount: row.seen_count,
  }));
}

export async function listKeywordTaxonomyVersions(): Promise<KeywordTaxonomyVersionSummary[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("keyword_taxonomy_versions")
    .select("version,status,change_summary,created_by,created_at")
    .order("version", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    version: row.version,
    status: row.status,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export async function getPendingKeywordTaxonomyDiff(): Promise<KeywordTaxonomyDiff | null> {
  const state = await getKeywordTaxonomyState();
  if (!state.pending) return null;
  return diffTaxonomies(state.active.taxonomy, state.pending.taxonomy);
}

export async function getCodeKeywordTaxonomyDiff(): Promise<KeywordTaxonomyDiff> {
  const active = await getActiveKeywordTaxonomy();
  return diffTaxonomies(active.taxonomy, validateKeywordTaxonomy(CATEGORY_KEYWORDS));
}

function taxonomiesEqual(left: CategoryKeywords[], right: CategoryKeywords[]): boolean {
  return JSON.stringify(validateKeywordTaxonomy(left)) === JSON.stringify(validateKeywordTaxonomy(right));
}

export async function isCodeKeywordTaxonomyActive(): Promise<boolean> {
  const { taxonomy } = await getActiveKeywordTaxonomy();
  return taxonomiesEqual(taxonomy, CATEGORY_KEYWORDS);
}

export async function isCodeKeywordTaxonomyPending(): Promise<boolean> {
  const { pending } = await getKeywordTaxonomyState();
  return pending ? taxonomiesEqual(pending.taxonomy, CATEGORY_KEYWORDS) : false;
}

export async function stageCodeKeywordTaxonomy(createdBy: string): Promise<number> {
  const { pending } = await getKeywordTaxonomyState();
  if (pending) {
    throw new Error(`v${pending.version} 적용 대기 변경이 있습니다. 먼저 적용하거나 전체 취소한 뒤 코드 변경을 준비하세요.`);
  }
  return savePendingKeywordTaxonomy(
    CATEGORY_KEYWORDS,
    createdBy,
    "코드 택소노미 적용 준비",
    [],
  );
}

export async function discardPendingKeywordTaxonomy(): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin().rpc("discard_pending_keyword_taxonomy");
  if (error) throw error;
  return data as number | null;
}

export async function restoreKeywordTaxonomyVersion(version: number, createdBy: string): Promise<number> {
  const restored = await getKeywordTaxonomyByVersion(version);
  await discardPendingKeywordTaxonomy();
  return savePendingKeywordTaxonomy(
    restored.taxonomy,
    createdBy,
    `v${version} 복원 대기`,
    [],
  );
}

function diffTaxonomies(active: CategoryKeywords[], pending: CategoryKeywords[]): KeywordTaxonomyDiff {
  const flatten = (taxonomy: CategoryKeywords[]) => {
    const groups = new Set<string>();
    const keywords = new Map<string, { category: KeywordCategorySlug; subgroup: string; keyword: string }>();
    for (const category of taxonomy) {
      for (const subgroup of category.subGroups) {
        groups.add(`${category.slug}::${subgroup.name}`);
        for (const keyword of subgroup.keywords) {
          keywords.set(`${category.slug}::${subgroup.name}::${normalizeTaxonomyKeyword(keyword)}`, {
            category: category.slug,
            subgroup: subgroup.name,
            keyword,
          });
        }
      }
    }
    return { groups, keywords };
  };
  const before = flatten(active);
  const after = flatten(pending);
  const parseGroup = (key: string) => {
    const [category, subgroup] = key.split("::") as [KeywordCategorySlug, string];
    return { category, subgroup };
  };
  return {
    addedKeywords: [...after.keywords].filter(([key]) => !before.keywords.has(key)).map(([, value]) => value),
    removedKeywords: [...before.keywords].filter(([key]) => !after.keywords.has(key)).map(([, value]) => value),
    addedSubgroups: [...after.groups].filter((key) => !before.groups.has(key)).map(parseGroup),
    removedSubgroups: [...before.groups].filter((key) => !after.groups.has(key)).map(parseGroup),
  };
}

export async function reviewKeywordTaxonomyCandidate(
  id: string,
  action: "approve" | "defer" | "reject",
  reviewedBy: string,
  target?: { category: KeywordCategorySlug; subgroup: string },
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: candidate, error } = await admin
    .from("keyword_taxonomy_candidates")
    .select("id,keyword,suggested_category,suggested_subgroup")
    .eq("id", id)
    .single();
  if (error) throw error;

  if (action === "approve") {
    const state = await getKeywordTaxonomyState();
    const next = structuredClone(state.pending?.taxonomy ?? state.active.taxonomy);
    const targetCategory = target?.category ?? candidate.suggested_category;
    const targetSubgroup = target?.subgroup ?? candidate.suggested_subgroup;
    const category = next.find((item) => item.slug === targetCategory);
    const subgroup = category?.subGroups.find((item) => item.name === targetSubgroup);
    if (!category || !subgroup) throw new Error("추천된 카테고리 또는 서브그룹을 찾을 수 없습니다.");
    const alreadyRegistered = subgroup.keywords.some(
      (keyword) => normalizeTaxonomyKeyword(keyword) === normalizeTaxonomyKeyword(candidate.keyword),
    );
    if (!alreadyRegistered) {
      if (subgroup.keywords.length >= 20) throw new Error("DataLab 서브그룹 키워드 20개 제한을 초과합니다.");
      subgroup.keywords.push(candidate.keyword);
      await savePendingKeywordTaxonomy(
        next,
        reviewedBy,
        `${category.slug}/${subgroup.name} 핵심 키워드 추가: ${candidate.keyword}`,
        [candidate.id],
      );
    } else {
      await savePendingKeywordTaxonomy(next, reviewedBy, `기등록 키워드 승인 처리: ${candidate.keyword}`, [candidate.id]);
    }
    return;
  }

  const status = action === "defer" ? "deferred" : "rejected";
  const { error: updateError } = await admin
    .from("keyword_taxonomy_candidates")
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw updateError;
}

export async function createTaxonomySubgroupFromCandidates(
  candidateIds: string[],
  categorySlug: KeywordCategorySlug,
  subgroupName: string,
  searchIntent: "informational" | "commercial" | "transactional" | "navigational",
  topicTemplate: string,
  topicAspect: string,
  reviewedBy: string,
): Promise<void> {
  if (candidateIds.length < 2 || candidateIds.length > 20) {
    throw new Error("새 서브그룹은 후보 키워드 2~20개를 선택해야 합니다.");
  }
  const admin = getSupabaseAdmin();
  const { data: candidates, error } = await admin
    .from("keyword_taxonomy_candidates")
    .select("id,keyword")
    .in("id", candidateIds)
    .eq("status", "pending");
  if (error) throw error;
  if (!candidates || candidates.length !== candidateIds.length) {
    throw new Error("선택한 후보 중 이미 처리됐거나 찾을 수 없는 항목이 있습니다.");
  }

  const state = await getKeywordTaxonomyState();
  const next = structuredClone(state.pending?.taxonomy ?? state.active.taxonomy);
  const category = next.find((item) => item.slug === categorySlug);
  if (!category) throw new Error("카테고리를 찾을 수 없습니다.");
  if (category.subGroups.some((group) => group.name === subgroupName)) {
    throw new Error("같은 이름의 서브그룹이 이미 있습니다.");
  }
  if (category.subGroups.length >= 15) throw new Error("카테고리당 서브그룹 15개 제한을 초과합니다.");

  category.subGroups.push({
    name: subgroupName,
    keywords: candidates.map((candidate) => candidate.keyword),
    searchIntent,
  });
  category.topicAngles.push({
    template: topicTemplate,
    subGroup: subgroupName,
    aspect: topicAspect,
  });

  await savePendingKeywordTaxonomy(
    next,
    reviewedBy,
    `${categorySlug} 새 서브그룹 생성: ${subgroupName} (${candidates.length}개 키워드)`,
    candidateIds,
  );
}

export async function approveKeywordTaxonomyCandidates(
  items: Array<{ id: string; category: KeywordCategorySlug; subgroup: string }>,
  reviewedBy: string,
): Promise<void> {
  if (items.length < 1 || items.length > 50) throw new Error("한 번에 1~50개 후보를 승인할 수 있습니다.");
  const admin = getSupabaseAdmin();
  const { data: candidates, error } = await admin
    .from("keyword_taxonomy_candidates")
    .select("id,keyword")
    .in("id", items.map((item) => item.id))
    .eq("status", "pending");
  if (error) throw error;
  if (!candidates || candidates.length !== items.length) {
    throw new Error("선택한 후보 중 이미 처리됐거나 찾을 수 없는 항목이 있습니다.");
  }

  const state = await getKeywordTaxonomyState();
  const next = structuredClone(state.pending?.taxonomy ?? state.active.taxonomy);
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const summaries: string[] = [];

  for (const item of items) {
    const candidate = candidateById.get(item.id)!;
    const category = next.find((entry) => entry.slug === item.category);
    const subgroup = category?.subGroups.find((entry) => entry.name === item.subgroup);
    if (!category || !subgroup) throw new Error(`${item.category}/${item.subgroup}을 찾을 수 없습니다.`);
    if (subgroup.keywords.some((keyword) => normalizeTaxonomyKeyword(keyword) === normalizeTaxonomyKeyword(candidate.keyword))) continue;
    if (subgroup.keywords.length >= 20) throw new Error(`${item.category}/${item.subgroup}의 키워드 20개 제한을 초과합니다.`);
    subgroup.keywords.push(candidate.keyword);
    summaries.push(`${item.category}/${item.subgroup}: ${candidate.keyword}`);
  }

  await savePendingKeywordTaxonomy(
    next,
    reviewedBy,
    `핵심 키워드 ${items.length}개 승인 · ${summaries.join(", ")}`,
    items.map((item) => item.id),
  );
}

export async function batchReviewKeywordTaxonomyCandidates(
  items: Array<{ id: string; action: "approve" | "defer" | "reject"; category?: KeywordCategorySlug; subgroup?: string }>,
  reviewedBy: string,
): Promise<void> {
  if (items.length < 1 || items.length > 100) throw new Error("한 번에 1~100개 후보를 처리할 수 있습니다.");

  const admin = getSupabaseAdmin();
  const { data: candidates, error } = await admin
    .from("keyword_taxonomy_candidates")
    .select("id,keyword,suggested_category,suggested_subgroup")
    .in("id", items.map((item) => item.id))
    .eq("status", "pending");
  if (error) throw error;
  if (!candidates || candidates.length !== items.length) {
    throw new Error("선택한 후보 중 이미 처리됐거나 찾을 수 없는 항목이 있습니다.");
  }

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const approvals = items.filter((item) => item.action === "approve");
  const deferIds = items.filter((item) => item.action === "defer").map((item) => item.id);
  const rejectIds = items.filter((item) => item.action === "reject").map((item) => item.id);

  // 1. Process approvals → single taxonomy version
  if (approvals.length > 0) {
    const state = await getKeywordTaxonomyState();
    const next = structuredClone(state.pending?.taxonomy ?? state.active.taxonomy);
    const summaries: string[] = [];

    for (const item of approvals) {
      const candidate = candidateById.get(item.id)!;
      const targetCategory = item.category ?? candidate.suggested_category;
      const targetSubgroup = item.subgroup ?? candidate.suggested_subgroup;
      const category = next.find((entry) => entry.slug === targetCategory);
      const subgroup = category?.subGroups.find((entry) => entry.name === targetSubgroup);
      if (!category || !subgroup) throw new Error(`${targetCategory}/${targetSubgroup}을 찾을 수 없습니다.`);
      if (subgroup.keywords.some((kw) => normalizeTaxonomyKeyword(kw) === normalizeTaxonomyKeyword(candidate.keyword))) continue;
      if (subgroup.keywords.length >= 20) throw new Error(`${targetCategory}/${targetSubgroup}의 키워드 20개 제한을 초과합니다.`);
      subgroup.keywords.push(candidate.keyword);
      summaries.push(`${targetCategory}/${targetSubgroup}: ${candidate.keyword}`);
    }

    await savePendingKeywordTaxonomy(
      next,
      reviewedBy,
      `일괄 검토: 승인 ${approvals.length}개${deferIds.length ? `, 보류 ${deferIds.length}개` : ""}${rejectIds.length ? `, 제외 ${rejectIds.length}개` : ""} · ${summaries.join(", ")}`,
      approvals.map((item) => item.id),
    );
  }

  // 2. Batch update defer/reject statuses
  const now = new Date().toISOString();
  if (deferIds.length > 0) {
    const { error: deferError } = await admin
      .from("keyword_taxonomy_candidates")
      .update({ status: "deferred", reviewed_by: reviewedBy, reviewed_at: now, updated_at: now })
      .in("id", deferIds);
    if (deferError) throw deferError;
  }
  if (rejectIds.length > 0) {
    const { error: rejectError } = await admin
      .from("keyword_taxonomy_candidates")
      .update({ status: "rejected", reviewed_by: reviewedBy, reviewed_at: now, updated_at: now })
      .in("id", rejectIds);
    if (rejectError) throw rejectError;
  }
}

export function normalizeTaxonomyKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, "").toLowerCase();
}

function codeFallback(): ActiveKeywordTaxonomy {
  return {
    id: null,
    version: GENERATED_KEYWORD_TAXONOMY_VERSION,
    source: "code-fallback",
    taxonomy: GENERATED_KEYWORD_TAXONOMY,
    createdAt: null,
  };
}
