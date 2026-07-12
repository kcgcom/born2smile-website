import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";

export interface TaxonomyCodeDiff {
  addedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
  removedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
  addedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
  removedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
}

export interface TaxonomyRefreshState {
  pendingVersion: number | null;
  codeMatchesActive: boolean;
  codeMatchesPending: boolean;
}

export type TaxonomyRefreshPlan = "refresh" | "stage-and-refresh" | "refresh-pending" | "conflict";

export function getTaxonomyRefreshPlan(state: TaxonomyRefreshState): TaxonomyRefreshPlan {
  if (state.pendingVersion != null) {
    return state.codeMatchesPending ? "refresh-pending" : "conflict";
  }
  return state.codeMatchesActive ? "refresh" : "stage-and-refresh";
}

export function getTaxonomyDiffCount(diff: TaxonomyCodeDiff): { added: number; removed: number } {
  return {
    added: diff.addedKeywords.length + diff.addedSubgroups.length,
    removed: diff.removedKeywords.length + diff.removedSubgroups.length,
  };
}

export function getTaxonomyDiffLines(
  diff: TaxonomyCodeDiff,
  getCategoryLabel: (category: KeywordCategorySlug) => string,
): string[] {
  return [
    ...diff.addedSubgroups.map((item) => `+ 새 서브그룹: ${getCategoryLabel(item.category)} / ${item.subgroup}`),
    ...diff.addedKeywords.map((item) => `+ 키워드: ${getCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`),
    ...diff.removedSubgroups.map((item) => `- 서브그룹: ${getCategoryLabel(item.category)} / ${item.subgroup}`),
    ...diff.removedKeywords.map((item) => `- 키워드: ${getCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`),
  ];
}
