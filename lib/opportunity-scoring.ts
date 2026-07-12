import type { KeywordCategorySlug, SearchIntent } from "./admin-naver-datalab-keywords";
import type { ContentGap } from "./trend-analysis";
import { TREATMENT_DETAILS } from "./treatments";

export const OPPORTUNITY_MODEL_VERSION = "opportunity-v1.6" as const;

export type OpportunityActionType = "blog" | "page" | "faq";
export type OpportunityConfidence = "B" | "C";
export type OpportunityEligibility = "eligible" | "needs-data" | "covered" | "not-applicable";
export type PageContentStatus = "covered" | "promote-from-faq" | "missing" | "needs-confirmation" | "not-applicable";

export interface OpportunityActionEvaluation {
  actionType: OpportunityActionType;
  valueScore: number | null;
  eligibility: OpportunityEligibility;
  reasons: string[];
}

export interface OpportunityEvaluation {
  key: string;
  slug: KeywordCategorySlug;
  category: KeywordCategorySlug;
  subGroup: string;
  modelVersion: typeof OPPORTUNITY_MODEL_VERSION;
  confidence: OpportunityConfidence;
  demandScore: number | null;
  contentGapScore: number;
  patientBusinessValue: number;
  strategicFit: number;
  pageGapScore: number | null;
  faqGapScore: number | null;
  pageContentStatus: PageContentStatus;
  questionSignal: number;
  missingSections: string[];
  recommendedBlocks: string[];
  actions: OpportunityActionEvaluation[];
}

const TREATMENT_BY_CATEGORY: Partial<Record<KeywordCategorySlug, keyof typeof TREATMENT_DETAILS>> = {
  implant: "implant",
  orthodontics: "orthodontics",
  prosthetics: "prosthetics",
  restorative: "restorative",
  prevention: "scaling",
  pediatric: "pediatric",
};

export const TARGET_PAGE_BY_CATEGORY: Record<KeywordCategorySlug, string> = {
  implant: "/treatments/implant",
  orthodontics: "/treatments/orthodontics",
  prosthetics: "/treatments/prosthetics",
  restorative: "/treatments/restorative",
  prevention: "/treatments/scaling",
  pediatric: "/treatments/pediatric",
  "health-tips": "/faq",
  "general-care": "/faq",
  "dental-choice": "/about",
};

const STRATEGIC_FIT: Record<KeywordCategorySlug, number> = {
  implant: 100,
  orthodontics: 90,
  prosthetics: 90,
  restorative: 90,
  prevention: 80,
  pediatric: 80,
  "dental-choice": 70,
  "health-tips": 60,
  "general-care": 50,
};

const STRONG_QUESTION_TERMS = ["비용", "가격", "보험", "통증", "부작용", "기간", "가능", "대상", "차이", "비교"];
const WEAK_QUESTION_TERMS = ["관리", "주의사항", "추천", "회복"];
const PATIENT_TERMS = ["통증", "부작용", "안전", "관리", "주의", "회복", "대상", "과정", "예방"];
const CONSULT_TERMS = ["비용", "가격", "보험", "비교", "차이", "종류", "기간", "가능", "대상", "추천", "치과"];

const FACETS = [
  { label: "비용·보험 안내", triggers: ["비용", "가격", "보험"], content: ["비용", "보험", "본인부담"] },
  { label: "치료 과정·기간", triggers: ["기간", "과정", "회복"], content: ["기간", "과정", "단계", "회복"] },
  { label: "통증·부작용 관리", triggers: ["통증", "아픈", "부작용"], content: ["통증", "마취", "부작용"] },
  { label: "치료 옵션 비교", triggers: ["비교", "차이", "종류", "브랜드"], content: ["비교", "차이", "종류", "장점"] },
  { label: "적합 대상·상담 기준", triggers: ["대상", "조건", "가능", "추천"], content: ["대상", "상태", "검사", "상담"] },
  { label: "치료 후 관리", triggers: ["관리", "주의사항"], content: ["관리", "주의", "정기"] },
] as const;

/** 실제 진료 페이지 범위와 맞지 않는 택소노미 주제. 기본값은 진료 카테고리 내 blog/page/faq 허용이다. */
const TOPIC_ACTION_OVERRIDES: Record<string, OpportunityActionType[]> = {
  "prosthetics:치아미백": ["blog"],
  "general-care:턱관절/이갈이": ["blog", "faq"],
  "general-care:발치/사랑니": ["blog", "faq"],
  "general-care:잇몸재생": ["blog", "faq"],
  "health-tips:증상/내원판단": ["blog", "faq"],
  "dental-choice:브랜드검색": [],
  "prevention:구강위생": ["blog"],
  "prevention:구강건조/타액": ["blog"],
  "pediatric:교정시기": ["blog"],
};
const EDUCATION_FAQ_TOPICS = new Set([
  "general-care:턱관절/이갈이",
  "general-care:발치/사랑니",
  "general-care:잇몸재생",
  "health-tips:증상/내원판단",
]);
const PAGE_CONFIRMATION_TOPICS = new Set(["implant:첨단/디지털"]);
const PAGE_STATUS_OVERRIDES: Partial<Record<string, PageContentStatus>> = {
  "implant:대상/조건": "covered",
  "orthodontics:대상/나이": "covered",
  "pediatric:소아치과/진정": "covered",
};

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function keywordPool(gap: ContentGap): string[] {
  return [...new Set([
    gap.subGroup,
    ...gap.keywords,
    ...gap.directKeywords.map((item) => item.keyword),
    ...gap.relatedKeywords.slice(0, 10).map((item) => item.keyword),
  ])];
}

function percentileScores(gaps: ContentGap[]): Map<string, number | null> {
  const known = gaps.filter((gap) => gap.monthlyVolume != null);
  const global = [...known].sort((a, b) => (a.monthlyVolume ?? 0) - (b.monthlyVolume ?? 0));
  const byCategory = new Map<KeywordCategorySlug, ContentGap[]>();
  for (const gap of known) {
    const list = byCategory.get(gap.slug) ?? [];
    list.push(gap);
    byCategory.set(gap.slug, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => (a.monthlyVolume ?? 0) - (b.monthlyVolume ?? 0));

  const percentile = (list: ContentGap[], gap: ContentGap) => {
    if (list.length <= 1) return 100;
    const index = list.findIndex((item) => item.slug === gap.slug && item.subGroup === gap.subGroup);
    return Math.round((index / (list.length - 1)) * 100);
  };

  return new Map(gaps.map((gap) => {
    const key = `${gap.slug}:${gap.subGroup}`;
    if (gap.monthlyVolume == null) return [key, null];
    const category = byCategory.get(gap.slug) ?? [gap];
    // 소규모 카테고리의 내부 백분위는 두 항목을 0/100으로 과도하게 양극화한다.
    if (category.length < 4) return [key, percentile(global, gap)];
    return [key, Math.round(percentile(global, gap) * 0.7 + percentile(category, gap) * 0.3)];
  }));
}

function intentValue(intent: SearchIntent): number {
  if (intent === "transactional") return 100;
  if (intent === "commercial") return 80;
  if (intent === "informational") return 50;
  return 30;
}

function patientBusinessValue(gap: ContentGap): number {
  const pool = normalize(keywordPool(gap).join(" "));
  const patient = PATIENT_TERMS.some((term) => pool.includes(normalize(term))) ? 100 : 55;
  const consultation = CONSULT_TERMS.some((term) => pool.includes(normalize(term))) ? 100 : intentValue(gap.searchIntent);
  return Math.round(patient * 0.5 + consultation * 0.5);
}

function topicTerms(gap: ContentGap): string[] {
  const generic = new Set(["치과", "치료", "병원", "정보", "추천", "관리"]);
  return [...new Set([
    ...gap.subGroup.split(/[\s/]+/),
    ...gap.keywords,
    ...gap.directKeywords.map((item) => item.keyword),
  ].map(normalize).filter((term) => term.length >= 2 && !generic.has(term)))];
}

function textCoverage(texts: string[], terms: string[]): number {
  if (terms.length === 0) return 0;
  const normalized = texts.map(normalize);
  return terms.some((term) => normalized.some((text) => text.includes(term))) ? 100 : 0;
}

function questionSignal(gap: ContentGap): number {
  const keywords = keywordPool(gap);
  if (keywords.some((keyword) => /[나인할까]요|할까$|어떻게|얼마/.test(keyword))) return 100;
  const strongMatches = keywords.filter((keyword) => STRONG_QUESTION_TERMS.some((term) => keyword.includes(term))).length;
  if (strongMatches >= 2) return 80;
  if (strongMatches === 1) return 70;
  const weakMatches = keywords.filter((keyword) => WEAK_QUESTION_TERMS.some((term) => keyword.includes(term))).length;
  if (weakMatches >= 2) return 55;
  return 20;
}

function allowedActions(gap: ContentGap): OpportunityActionType[] {
  const override = TOPIC_ACTION_OVERRIDES[`${gap.slug}:${gap.subGroup}`];
  if (override) return override;
  return TREATMENT_BY_CATEGORY[gap.slug] ? ["blog", "page", "faq"] : ["blog"];
}

function pageEvidence(gap: ContentGap): { pageCoverage: number | null; pageGap: number | null; faqCoverage: number | null; faqGap: number | null; missing: string[]; blocks: string[] } {
  const treatmentId = TREATMENT_BY_CATEGORY[gap.slug];
  if (!treatmentId) return { pageCoverage: null, pageGap: null, faqCoverage: null, faqGap: null, missing: [], blocks: [] };
  const detail = TREATMENT_DETAILS[treatmentId];
  const primaryTexts = [detail.name, detail.subtitle, detail.description];
  const supportingTexts = [...(detail.audience ?? []), ...detail.steps.flatMap((item) => [item.title, item.desc]), ...detail.advantages];
  const terms = topicTerms(gap);
  const primaryCoverage = textCoverage(primaryTexts, terms);
  const supportingCoverage = textCoverage(supportingTexts, terms);
  const pageCoverage = Math.min(100, Math.max(primaryCoverage, Math.round(supportingCoverage * 0.7)));
  const pageText = normalize([...primaryTexts, ...supportingTexts].join(" "));
  const pool = normalize(keywordPool(gap).join(" "));
  const relevantFacets = FACETS.filter((facet) => facet.triggers.some((term) => pool.includes(normalize(term))));
  const expected = relevantFacets.length > 0 ? relevantFacets : [{ label: "핵심 주제 설명", content: gap.keywords.length ? gap.keywords : [gap.subGroup] }];
  const missing = expected.filter((facet) => !facet.content.some((term) => pageText.includes(normalize(term)))).map((facet) => facet.label);
  if (pageCoverage < 70 && !missing.includes("핵심 주제 설명")) missing.unshift("핵심 주제 설명");
  const pageGap = 100 - pageCoverage;
  const faqQuestionCoverage = textCoverage(detail.faq.map((item) => item.q), terms);
  const faqAnswerCoverage = textCoverage(detail.faq.map((item) => item.a), terms);
  const faqCoverage = Math.min(100, Math.max(faqQuestionCoverage, Math.round(faqAnswerCoverage * 0.7)));
  const faqGap = 100 - faqCoverage;
  const blocks = missing.map((section) => {
    if (section.includes("비용")) return "비용·보험 FAQ";
    if (section.includes("과정")) return "치료 단계 타임라인";
    if (section.includes("비교")) return "옵션 비교 표";
    if (section.includes("관리")) return "치료 후 관리 체크리스트";
    return `${section} 섹션`;
  });
  return { pageCoverage, pageGap, faqCoverage, faqGap, missing, blocks };
}

function action(
  actionType: OpportunityActionType,
  score: number | null,
  eligibility: OpportunityEligibility,
  reasons: string[],
): OpportunityActionEvaluation {
  return { actionType, valueScore: score == null ? null : Math.round(score), eligibility, reasons };
}

export function evaluateOpportunities(gaps: ContentGap[]): OpportunityEvaluation[] {
  const demands = percentileScores(gaps);
  return gaps.map((gap) => {
    const key = `${gap.slug}:${gap.subGroup}`;
    const demand = demands.get(key) ?? null;
    const business = patientBusinessValue(gap);
    const strategic = STRATEGIC_FIT[gap.slug];
    const page = pageEvidence(gap);
    const allowed = allowedActions(gap);
    const question = questionSignal(gap);
    const isEducationFaq = EDUCATION_FAQ_TOPICS.has(key);
    const educationFaqCoverage = isEducationFaq
      ? Math.max(
          textCoverage(Object.values(TREATMENT_DETAILS).flatMap((detail) => detail.faq.map((item) => item.q)), topicTerms(gap)),
          Math.round(textCoverage(Object.values(TREATMENT_DETAILS).flatMap((detail) => detail.faq.map((item) => item.a)), topicTerms(gap)) * 0.7),
        )
      : null;
    const faqGap = page.faqGap ?? (educationFaqCoverage == null ? null : 100 - educationFaqCoverage);
    const confidence: OpportunityConfidence = demand == null ? "C" : "B";
    const needsData = demand == null;
    const pageContentStatus: PageContentStatus = PAGE_STATUS_OVERRIDES[key] ?? (!allowed.includes("page") || page.pageCoverage == null
      ? "not-applicable"
      : PAGE_CONFIRMATION_TOPICS.has(key)
        ? "needs-confirmation"
        : page.pageCoverage >= 70
          ? "covered"
          : (page.faqCoverage ?? 0) >= 70
            ? "promote-from-faq"
            : "missing");

    const blogEligibility: OpportunityEligibility = !allowed.includes("blog")
      ? "not-applicable"
      : needsData ? "needs-data" : gap.contentGapScore < 25 ? "covered" : "eligible";
    const blogScore = blogEligibility === "eligible"
      ? demand! * 0.35 + gap.contentGapScore * 0.35 + business * 0.2 + strategic * 0.1
      : null;
    const pageEligibility: OpportunityEligibility = pageContentStatus === "not-applicable" || pageContentStatus === "needs-confirmation" || page.pageGap == null
      ? "not-applicable"
      : needsData ? "needs-data" : pageContentStatus === "covered" ? "covered" : "eligible";
    const pageScore = pageEligibility === "eligible"
      ? page.pageGap! * 0.35 + business * 0.25 + demand! * 0.25 + strategic * 0.15
      : null;
    const faqEligibility: OpportunityEligibility = !allowed.includes("faq") || faqGap == null
      ? "not-applicable"
      : needsData ? "needs-data"
        : isEducationFaq
          ? question < 60 || (educationFaqCoverage ?? 0) >= 70 ? "covered" : "eligible"
          : (page.pageCoverage ?? 0) < 40 ? "not-applicable"
            : question < 60 || (page.faqCoverage ?? 0) >= 70 ? "covered" : "eligible";
    const faqScore = faqEligibility === "eligible"
      ? question * 0.25 + faqGap! * 0.25 + demand! * 0.15 + business * 0.2 + strategic * 0.15
      : null;

    return {
      key,
      slug: gap.slug,
      category: gap.category,
      subGroup: gap.subGroup,
      modelVersion: OPPORTUNITY_MODEL_VERSION,
      confidence,
      demandScore: demand,
      contentGapScore: gap.contentGapScore,
      patientBusinessValue: business,
      strategicFit: strategic,
      pageGapScore: page.pageGap,
      faqGapScore: faqGap,
      pageContentStatus,
      questionSignal: question,
      missingSections: page.missing,
      recommendedBlocks: page.blocks,
      actions: [
        action("blog", blogScore, blogEligibility, blogEligibility === "not-applicable"
          ? ["신규 글 추천 대상 아님"]
          : [
              `검색 수요 ${demand ?? "확인 불가"}`,
              `콘텐츠 공백 ${gap.contentGapScore}`,
            ]),
        action("page", pageScore, pageEligibility, page.missing.length ? page.missing : ["페이지 공백 없음"]),
        action("faq", faqScore, faqEligibility, [
          `질문 신호 ${question}`,
          `페이지 본문 커버리지 ${page.pageCoverage ?? "해당 없음"}`,
          `FAQ 공백 ${faqGap ?? "해당 없음"}`,
        ]),
      ],
    };
  });
}

export function getActionEvaluation(evaluation: OpportunityEvaluation, type: OpportunityActionType) {
  return evaluation.actions.find((item) => item.actionType === type);
}
