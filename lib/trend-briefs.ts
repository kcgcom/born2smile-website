import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import type { ContentGap } from "./trend-analysis";
import type { FaqSuggestion, PageUpdateOpportunity } from "./trend-insights";

export interface BlogBriefSuggestion {
  slug: KeywordCategorySlug;
  subGroup: string;
  suggestedTitle: string;
  targetKeyword: string;
  searchIntent: string;
  targetReader: string;
  outline: string[];
  cta: string;
  metaDescription: string;
  targetPage: string;
}

export interface PageImprovementBrief {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  heroCopy: string;
  supportingCopy: string;
  blocks: string[];
  faqQuestions: string[];
  cta: string;
  sourceFiles: string[];
  checklist: string[];
}

function getPrimaryKeyword(gap: ContentGap): string {
  return gap.directKeywords?.[0]?.keyword ?? gap.relatedKeywords?.[0]?.keyword ?? gap.keywords[0] ?? gap.subGroup;
}

function getReaderLabel(gap: ContentGap): string {
  if (gap.searchIntent === "transactional") return "상담과 예약을 고려하는 환자";
  if (gap.searchIntent === "commercial") return "치료 옵션을 비교 중인 환자";
  if (gap.searchIntent === "informational") return "치료 전 정보를 찾는 환자";
  return "병원을 탐색 중인 방문자";
}

function buildOutline(gap: ContentGap): string[] {
  const primaryKeyword = getPrimaryKeyword(gap);
  const outline = [
    `${primaryKeyword}가 중요한 이유와 진료실에서 자주 받는 질문`,
    `${gap.subGroup} 판단 기준과 개인별 차이가 생기는 요인`,
    `${primaryKeyword} 상담 전 체크리스트와 주의사항`,
  ];

  if (gap.searchIntent === "commercial" || gap.searchIntent === "transactional") {
    outline.push("비용·기간·내원 횟수를 설명하는 비교 섹션");
  }
  if (gap.searchIntent === "informational") {
    outline.push("치료 과정과 관리법을 쉽게 설명하는 FAQ 섹션");
  }

  return outline.slice(0, 4);
}

function buildMetaDescription(gap: ContentGap): string {
  const primaryKeyword = getPrimaryKeyword(gap);
  return `${primaryKeyword}이 궁금한 환자를 위해 ${gap.subGroup} 핵심 기준, 치료 전후 체크포인트, 상담 시 꼭 물어볼 질문을 서울본치과 관점에서 정리했습니다.`;
}

export function generateBlogBriefSuggestions(gaps: ContentGap[]): BlogBriefSuggestion[] {
  return gaps
    .slice(0, 8)
    .map((gap) => {
      const primaryKeyword = getPrimaryKeyword(gap);
      return {
        slug: gap.slug,
        subGroup: gap.subGroup,
        suggestedTitle: `${primaryKeyword} 가이드: ${gap.subGroup} 환자가 먼저 확인할 것`,
        targetKeyword: primaryKeyword,
        searchIntent: gap.searchIntent,
        targetReader: getReaderLabel(gap),
        outline: buildOutline(gap),
        cta: `${primaryKeyword} 상담이 필요하다면 치료 전 체크포인트를 확인한 뒤 문의로 연결`,
        metaDescription: buildMetaDescription(gap),
        targetPage: `/blog/${gap.slug}`,
      } satisfies BlogBriefSuggestion;
    });
}

function buildHeroCopy(item: PageUpdateOpportunity): string {
  return `${item.subGroup}이 궁금한 환자도 첫 화면에서 바로 이해할 수 있도록 핵심 답변을 먼저 보여주세요.`;
}

function buildSupportingCopy(item: PageUpdateOpportunity): string {
  return `${item.missingSections.join(", ")} 중심으로 섹션을 보강하면 검색 의도와 랜딩 경험이 더 잘 맞습니다.`;
}

function getSourceFiles(targetPage: string): string[] {
  if (targetPage.startsWith("/treatments/")) {
    return ["app/treatments/[slug]/page.tsx", "lib/treatments.ts"];
  }
  if (targetPage === "/faq") {
    return ["app/faq/page.tsx", "lib/treatments.ts"];
  }
  if (targetPage === "/about") {
    return ["app/about/page.tsx", "lib/constants.ts"];
  }
  if (targetPage === "/contact") {
    return ["app/contact/page.tsx", "lib/constants.ts"];
  }
  return ["app/page.tsx", "lib/constants.ts"];
}

function buildChecklist(item: PageUpdateOpportunity, faqQuestions: string[]): string[] {
  const checklist = [
    `${item.missingSections[0] ?? "핵심 요약"}를 첫 1~2스크린 안에 보이도록 재배치`,
    `${item.recommendedBlocks[0] ?? "FAQ 아코디언"} 블록을 현재 섹션 구조에 맞게 추가`,
    "상단 CTA 문구가 검색 의도와 직접 연결되는지 점검",
  ];

  if (faqQuestions.length > 0) {
    checklist.push(`FAQ에 "${faqQuestions[0]}" 질문 반영`);
  }
  if (item.missingSections.some((section) => section.includes("비용") || section.includes("보험"))) {
    checklist.push("비용·보험 관련 표현이 과장 없이 명확한지 검수");
  }

  return checklist.slice(0, 5);
}

export function generatePageImprovementBriefs(
  opportunities: PageUpdateOpportunity[],
  faqSuggestions: FaqSuggestion[],
): PageImprovementBrief[] {
  const faqMap = new Map<string, string[]>();
  for (const faq of faqSuggestions) {
    const key = `${faq.slug}:${faq.subGroup}`;
    const list = faqMap.get(key) ?? [];
    list.push(faq.question);
    faqMap.set(key, list);
  }

  return opportunities.slice(0, 8).map((item) => {
    const key = `${item.slug}:${item.subGroup}`;
    const faqQuestions = (faqMap.get(key) ?? []).slice(0, 3);
    return {
      slug: item.slug,
      subGroup: item.subGroup,
      targetPage: item.targetPage,
      heroCopy: buildHeroCopy(item),
      supportingCopy: buildSupportingCopy(item),
      blocks: item.recommendedBlocks,
      faqQuestions,
      cta: "전화 상담·빠른 예약 버튼을 상단 요약 아래에 배치해 다음 행동을 명확히 보여주세요.",
      sourceFiles: getSourceFiles(item.targetPage),
      checklist: buildChecklist(item, faqQuestions),
    } satisfies PageImprovementBrief;
  });
}
