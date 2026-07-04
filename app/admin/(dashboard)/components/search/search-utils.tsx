import type { BlogCategorySlug } from "@/lib/blog/types";
import { getCategoryLabel, isBlogCategorySlug } from "@/lib/blog/category-slugs";
import type {
  QueryActionRecommendation,
  RewriteReasonBadge,
  SearchConsoleData,
  SearchMetricRow,
  SearchPriorityRow,
} from "./search-types";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

export const PERIODS = [
  { value: "28d", label: "1개월" },
  { value: "90d", label: "3개월" },
  { value: "180d", label: "6개월" },
];

export const DEFAULT_SORT_DIRECTION = {
  impressions: "desc",
  clicks: "desc",
  ctr: "desc",
  position: "asc",
} as const;

// ---------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------

export function hasQuery(row: SearchPriorityRow): row is SearchConsoleData["topQueries"][number] {
  return "query" in row;
}

// ---------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------

export function formatCtr(ctr: number, lowThreshold = 2) {
  const tone = ctr < lowThreshold ? "text-amber-600" : "text-[var(--foreground)]";
  return <span className={`font-medium tabular-nums ${tone}`}>{ctr}%</span>;
}

// ---------------------------------------------------------------
// URL / page helpers
// ---------------------------------------------------------------

export function getEditableBlogSlug(page: string) {
  const match = page.match(/^\/blog\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, category, slug] = match;
  return isBlogCategorySlug(category) ? slug : null;
}

export function getBlogCategoryFromPage(page: string): BlogCategorySlug | null {
  const blogMatch = page.match(/^\/blog\/([^/]+)(?:\/[^/]+)?\/?$/);
  if (blogMatch && isBlogCategorySlug(blogMatch[1])) {
    return blogMatch[1];
  }

  const treatmentMatch = page.match(/^\/treatments\/([^/]+)\/?$/);
  if (!treatmentMatch) return null;

  const treatmentToCategory: Record<string, string> = {
    implant: "implant",
    orthodontics: "orthodontics",
    prosthetics: "prosthetics",
    restorative: "restorative",
    pediatric: "pediatric",
    prevention: "prevention",
    scaling: "prevention",
  };

  const category = treatmentToCategory[treatmentMatch[1]];
  return category && isBlogCategorySlug(category) ? category : null;
}

// ---------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------

export function getRewriteReasonBadges(row: SearchMetricRow): RewriteReasonBadge[] {
  const badges: RewriteReasonBadge[] = [];

  if (row.ctr < 1.5) {
    badges.push({
      label: "CTR 매우 낮음",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    });
  } else if (row.ctr < 2.5) {
    badges.push({
      label: "CTR 개선 필요",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    });
  }

  if (row.position > 12) {
    badges.push({
      label: "순위 낮음",
      className: "bg-violet-50 text-violet-700 ring-violet-100",
    });
  } else if (row.position > 8) {
    badges.push({
      label: "본문 보강 후보",
      className: "bg-blue-50 text-blue-700 ring-blue-100",
    });
  }

  if (row.impressions >= 150 && row.clicks < 8) {
    badges.push({
      label: "노출 대비 클릭 약함",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    });
  }

  return badges;
}

export function buildSuggestedTitles(query: string, category?: BlogCategorySlug | null) {
  const currentYear = new Date().getFullYear();
  const categoryLabel = category ? getCategoryLabel(category) : null;
  const categoryPrefix = categoryLabel ? `${categoryLabel} ` : "";

  return [
    `${currentYear}년 ${query} 가이드: 꼭 알아야 할 핵심 정리`,
    `${categoryPrefix}${query} 치료 전 체크해야 할 5가지`,
    `${query}, 어떤 경우에 치과 상담이 필요할까?`,
  ];
}

export function getMetaChecklist(page: string, row: SearchMetricRow) {
  const checklist = [
    "제목 앞에 핵심 키워드 배치",
    "메타 설명에 핵심 정보 1개 이상 포함",
  ];

  if (row.ctr < 1.5) {
    checklist.push("숫자·기간 표현 추가");
  }

  if (page.startsWith("/blog/")) {
    checklist.push("도입부/FAQ가 검색 의도와 맞는지 점검");
  } else if (page.startsWith("/treatments/")) {
    checklist.push("title/description 핵심 항목 보완");
  } else {
    checklist.push("대표 질문 1개를 요약 문구에 반영");
  }

  return checklist.slice(0, 3);
}

export function getQueryActionRecommendation(
  query: string,
  pages: SearchConsoleData["queryTopPages"][string] | undefined,
): QueryActionRecommendation {
  const relatedPages = pages ?? [];

  const editablePage = relatedPages.find((item) => getEditableBlogSlug(item.page));
  if (editablePage) {
    return {
      kind: "edit",
      label: "기존 글 수정 추천",
      description: `${editablePage.page} 글이 이미 이 키워드를 받고 있어 빠른 성과 개선이 가능합니다.`,
      slug: getEditableBlogSlug(editablePage.page) ?? undefined,
    };
  }

  const category = relatedPages
    .map((item) => getBlogCategoryFromPage(item.page))
    .find((value): value is BlogCategorySlug => value !== null);
  if (category) {
    const categoryLabel = getCategoryLabel(category);
    return {
      kind: "new",
      label: "관련 글 작성 추천",
      description: `${categoryLabel} 카테��리에서 별도 글로 검색 의도를 분리해 공략하는 편이 좋습니다.`,
      category,
      suggestedTitles: buildSuggestedTitles(query, category),
    };
  }

  return {
    kind: "review",
    label: "수동 검토 필요",
    description: "연결 페이지를 보고 수정 또는 새 글 여부를 정하세요.",
    suggestedTitles: buildSuggestedTitles(query, null),
  };
}
