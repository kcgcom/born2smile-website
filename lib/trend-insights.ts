import type { KeywordCategorySlug, SearchIntent } from "./admin-naver-datalab-keywords";
import type { ContentGap } from "./trend-analysis";
import { TREATMENT_DETAILS } from "./treatments";

export type InsightActionType =
  | "new-post"
  | "update-service-page"
  | "expand-faq"
  | "strengthen-cta"
  | "seasonal-campaign";

export type BusinessValue = "high" | "medium" | "low";

export interface InsightAction {
  slug: KeywordCategorySlug;
  subGroup: string;
  actionType: InsightActionType;
  businessValue: BusinessValue;
  confidence: number;
  reason: string;
  targetPage: string;
}

export interface FaqSuggestion {
  slug: KeywordCategorySlug;
  subGroup: string;
  question: string;
  priority: number;
  keywords: string[];
  targetPage: string;
}

export interface PageUpdateOpportunity {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  pageUpdateScore: number;
  missingSections: string[];
  recommendedBlocks: string[];
}

const QUESTION_KEYWORDS = ["비용", "가격", "보험", "통증", "부작용", "기간", "회복", "관리", "주의사항", "차이", "비교", "가능", "대상", "추천"];

const HIGH_VALUE_KEYWORDS = ["비용", "가격", "보험", "기간", "대상", "조건", "추천", "비교", "주말", "야간", "통증"];
const MEDIUM_VALUE_KEYWORDS = ["관리", "부작용", "종류", "브랜드", "과정", "회복", "예방"];

const SEASONAL_KEYWORDS = ["방학", "수능", "여름", "겨울", "연말", "검진"];

const CATEGORY_PAGE_MAP: Record<KeywordCategorySlug, string> = {
  implant: "/treatments/implant",
  orthodontics: "/treatments/orthodontics",
  prosthetics: "/treatments/prosthetics",
  restorative: "/treatments/restorative",
  prevention: "/treatments/scaling",
  pediatric: "/treatments/pediatric",
  "health-tips": "/faq",
  "dental-choice": "/about",
};

const CATEGORY_TREATMENT_MAP: Partial<Record<KeywordCategorySlug, keyof typeof TREATMENT_DETAILS>> = {
  implant: "implant",
  orthodontics: "orthodontics",
  prosthetics: "prosthetics",
  restorative: "restorative",
  prevention: "scaling",
  pediatric: "pediatric",
};

function getTargetPage(slug: KeywordCategorySlug): string {
  return CATEGORY_PAGE_MAP[slug] ?? "/faq";
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function collectTokens(gap: ContentGap): string[] {
  return [gap.subGroup, ...gap.keywords, ...(gap.directKeywords ?? []).map((item) => item.keyword)]
    .map(normalizeText)
    .filter(Boolean);
}

function getExistingFaqCoverage(gap: ContentGap): number {
  const treatmentId = CATEGORY_TREATMENT_MAP[gap.slug];
  if (!treatmentId) return 0;

  const faqs = TREATMENT_DETAILS[treatmentId].faq;
  const tokens = collectTokens(gap);
  return faqs.filter((faq) => {
    const haystack = normalizeText(`${faq.q} ${faq.a}`);
    return tokens.some((token) => haystack.includes(token));
  }).length;
}

function getKeywordPool(gap: ContentGap): string[] {
  const seen = new Set<string>();
  return [
    ...(gap.directKeywords ?? []).map((item) => item.keyword),
    ...(gap.relatedKeywords ?? []).map((item) => item.keyword),
    ...gap.keywords,
    gap.subGroup,
  ].filter((keyword) => {
    if (!keyword || seen.has(keyword)) return false;
    seen.add(keyword);
    return true;
  });
}

function scoreVolume(gap: ContentGap): number {
  if (gap.monthlyVolume != null) {
    return Math.min(100, Math.log10(gap.monthlyVolume + 1) * 25);
  }
  return Math.min(100, gap.currentAvg);
}

function getBusinessValue(gap: ContentGap): BusinessValue {
  const pool = getKeywordPool(gap).join(" ");
  if (HIGH_VALUE_KEYWORDS.some((kw) => pool.includes(kw))) return "high";
  if (MEDIUM_VALUE_KEYWORDS.some((kw) => pool.includes(kw))) return "medium";
  if (gap.searchIntent === "transactional" || gap.searchIntent === "commercial") return "high";
  return "low";
}

function inferMissingSections(gap: ContentGap): string[] {
  const pool = getKeywordPool(gap).join(" ");
  const sections = new Set<string>();

  if (pool.includes("비용") || pool.includes("가격") || pool.includes("보험")) {
    sections.add("비용·보험 안내");
  }
  if (pool.includes("기간") || pool.includes("과정") || pool.includes("회복")) sections.add("치료 과정·기간");
  if (pool.includes("통증") || pool.includes("부작용")) sections.add("통증·부작용 관리");
  if (pool.includes("비교") || pool.includes("차이") || pool.includes("종류") || pool.includes("브랜드")) sections.add("치료 옵션 비교");
  if (pool.includes("대상") || pool.includes("조건") || pool.includes("가능")) sections.add("적합 대상·상담 기준");
  if (pool.includes("관리") || pool.includes("주의사항")) sections.add("치료 후 관리");

  if (sections.size === 0) {
    sections.add("핵심 요약 섹션");
    sections.add("자주 묻는 질문");
  }

  return [...sections].slice(0, 4);
}

function inferRecommendedBlocks(gap: ContentGap): string[] {
  const blocks = new Set<string>();
  const pool = getKeywordPool(gap).join(" ");

  if (gap.searchIntent === "transactional") blocks.add("상단 예약 CTA");
  if (gap.searchIntent === "commercial") blocks.add("비용 비교 카드");
  if (pool.includes("보험")) blocks.add("보험 적용 FAQ");
  if (pool.includes("통증") || pool.includes("부작용")) blocks.add("통증/부작용 안심 안내");
  if (pool.includes("기간") || pool.includes("과정")) blocks.add("치료 단계 타임라인");
  if (pool.includes("비교") || pool.includes("차이") || pool.includes("종류")) blocks.add("옵션 비교 표");
  if (pool.includes("관리") || pool.includes("주의사항")) blocks.add("치료 후 관리 체크리스트");

  if (blocks.size === 0) blocks.add("핵심 FAQ 아코디언");
  return [...blocks].slice(0, 4);
}

function inferQuestion(keyword: string, intent: SearchIntent | undefined): string {
  if (keyword.includes("비용") || keyword.includes("가격")) return `${keyword}은 어떤 기준으로 달라지나요?`;
  if (keyword.includes("보험")) return `${keyword} 적용 대상과 본인부담금은 어떻게 되나요?`;
  if (keyword.includes("통증")) return `${keyword} 시 통증은 어느 정도이고 어떻게 관리하나요?`;
  if (keyword.includes("기간") || keyword.includes("과정")) return `${keyword}은 보통 얼마나 걸리나요?`;
  if (keyword.includes("부작용")) return `${keyword}이 걱정될 때 꼭 확인할 점은 무엇인가요?`;
  if (keyword.includes("관리") || keyword.includes("주의사항")) return `${keyword}에서 꼭 지켜야 할 관리법은 무엇인가요?`;
  if (keyword.includes("비교") || keyword.includes("차이") || keyword.includes("종류")) return `${keyword}의 차이는 무엇이고 어떤 경우에 적합한가요?`;
  if (keyword.includes("대상") || keyword.includes("조건") || keyword.includes("가능")) return `${keyword}이 가능한 대상은 어떻게 판단하나요?`;
  if (intent === "commercial") return `${keyword}을 선택할 때 가장 먼저 비교해야 할 기준은 무엇인가요?`;
  if (intent === "transactional") return `${keyword} 상담 전에 미리 확인해야 할 사항은 무엇인가요?`;
  return `${keyword}에 대해 환자분들이 가장 많이 묻는 내용은 무엇인가요?`;
}

function getFaqPriority(gap: ContentGap, existingFaqCoverage: number): number {
  const questionWeight = getKeywordPool(gap).some((kw) => QUESTION_KEYWORDS.some((needle) => kw.includes(needle))) ? 100 : 60;
  const faqLack = Math.max(0, 100 - existingFaqCoverage * 30);
  const intentBoost = gap.searchIntent === "transactional" ? 100 : gap.searchIntent === "commercial" ? 85 : 60;
  return Math.round(questionWeight * 0.35 + faqLack * 0.35 + intentBoost * 0.15 + scoreVolume(gap) * 0.15);
}

export function scorePageUpdateOpportunity(gap: ContentGap): number {
  const volume = scoreVolume(gap);
  const intentWeight =
    gap.searchIntent === "transactional" ? 100 :
    gap.searchIntent === "commercial" ? 85 :
    gap.searchIntent === "informational" ? 60 : 40;
  const existingFaqCoverage = getExistingFaqCoverage(gap);
  const faqCoverageLack = Math.max(0, 100 - existingFaqCoverage * 25);
  const trendBonus = Math.min(100, Math.max(0, 50 + gap.changeRate));

  return Math.round(
    volume * 0.35 +
    intentWeight * 0.25 +
    faqCoverageLack * 0.25 +
    trendBonus * 0.15,
  );
}

export function buildPageUpdateOpportunities(gaps: ContentGap[]): PageUpdateOpportunity[] {
  return gaps
    .filter((gap) => CATEGORY_TREATMENT_MAP[gap.slug])
    .map((gap) => ({
      slug: gap.slug,
      subGroup: gap.subGroup,
      targetPage: getTargetPage(gap.slug),
      pageUpdateScore: scorePageUpdateOpportunity(gap),
      missingSections: inferMissingSections(gap),
      recommendedBlocks: inferRecommendedBlocks(gap),
    }))
    .sort((a, b) => b.pageUpdateScore - a.pageUpdateScore)
    .slice(0, 12);
}

export function generateFaqSuggestions(gaps: ContentGap[]): FaqSuggestion[] {
  return gaps
    .map((gap) => {
      const existingFaqCoverage = getExistingFaqCoverage(gap);
      const keyword = getKeywordPool(gap)[0] ?? gap.subGroup;
      return {
        slug: gap.slug,
        subGroup: gap.subGroup,
        question: inferQuestion(keyword, gap.searchIntent),
        priority: getFaqPriority(gap, existingFaqCoverage),
        keywords: getKeywordPool(gap).slice(0, 4),
        targetPage: getTargetPage(gap.slug),
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 12);
}

export function deriveInsightActions(gaps: ContentGap[]): InsightAction[] {
  const pageOpportunities = buildPageUpdateOpportunities(gaps);
  const pageScoreByKey = new Map(pageOpportunities.map((item) => [`${item.slug}:${item.subGroup}`, item.pageUpdateScore]));

  return gaps
    .map((gap) => {
      const key = `${gap.slug}:${gap.subGroup}`;
      const pageScore = pageScoreByKey.get(key) ?? scorePageUpdateOpportunity(gap);
      const volume = scoreVolume(gap);
      const businessValue = getBusinessValue(gap);
      const targetPage = getTargetPage(gap.slug);
      const keywordPool = getKeywordPool(gap).join(" ");

      let actionType: InsightActionType = "new-post";
      if (SEASONAL_KEYWORDS.some((kw) => keywordPool.includes(kw))) {
        actionType = "seasonal-campaign";
      } else if (gap.searchIntent === "transactional" && (volume >= 55 || gap.changeRate > 10)) {
        actionType = "strengthen-cta";
      } else if (pageScore >= 72 || gap.searchIntent === "commercial") {
        actionType = "update-service-page";
      } else if (QUESTION_KEYWORDS.some((kw) => keywordPool.includes(kw))) {
        actionType = "expand-faq";
      }

      const confidenceBase = Math.round(gap.gapScore * 0.45 + pageScore * 0.35 + volume * 0.2);
      const confidence = Math.min(100, confidenceBase + (businessValue === "high" ? 8 : businessValue === "medium" ? 4 : 0));
      const reason = `${gap.subGroup} · 검색량 ${gap.monthlyVolume != null ? `${gap.monthlyVolume.toLocaleString("ko-KR")}/월` : `상대지수 ${gap.currentAvg.toFixed(0)}`} · 포스트 ${gap.existingPostCount}개 · ${gap.changeRate > 0 ? `상승 ${gap.changeRate.toFixed(1)}%` : `갭 점수 ${gap.gapScore}`}`;

      return {
        slug: gap.slug,
        subGroup: gap.subGroup,
        actionType,
        businessValue,
        confidence,
        reason,
        targetPage,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);
}
