import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import {
  TARGET_PAGE_BY_CATEGORY,
  getActionEvaluation,
  type OpportunityActionType,
  type OpportunityEvaluation,
} from "./opportunity-scoring";
import type { ContentGap } from "./trend-analysis";

export interface InsightAction {
  slug: KeywordCategorySlug;
  subGroup: string;
  actionType: OpportunityActionType;
  valueScore: number;
  confidence: "B" | "C";
  reason: string;
  targetPage: string;
}

export interface FaqSuggestion {
  slug: KeywordCategorySlug;
  subGroup: string;
  question: string;
  valueScore: number;
  keywords: string[];
  targetPage: string;
}

export interface PageUpdateOpportunity {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  pageValueScore: number;
  missingSections: string[];
  recommendedBlocks: string[];
  contributingTopics: Array<{
    topicKey: string;
    subGroup: string;
    valueScore: number;
    status: "promote-from-faq" | "missing";
    missingSections: string[];
  }>;
  confirmationTopics: Array<{ topicKey: string; subGroup: string }>;
}

function evaluationMap(evaluations: OpportunityEvaluation[]) {
  return new Map(evaluations.map((item) => [item.key, item]));
}

function getPrimaryKeyword(gap: ContentGap): string {
  return gap.directKeywords[0]?.keyword ?? gap.relatedKeywords[0]?.keyword ?? gap.keywords[0] ?? gap.subGroup;
}

function inferQuestion(gap: ContentGap): string {
  const keyword = getPrimaryKeyword(gap);
  if (keyword.includes("비용") || keyword.includes("가격")) return `${keyword}은 어떤 기준으로 달라지나요?`;
  if (keyword.includes("보험")) return `${keyword} 적용 대상과 본인부담금은 어떻게 되나요?`;
  if (keyword.includes("통증")) return `${keyword} 시 통증은 어느 정도이고 어떻게 관리하나요?`;
  if (keyword.includes("기간") || keyword.includes("과정")) return `${keyword}은 보통 얼마나 걸리나요?`;
  if (keyword.includes("비교") || keyword.includes("차이")) return `${keyword}의 차이와 선택 기준은 무엇인가요?`;
  return `${keyword}에 대해 환자분들이 가장 많이 묻는 내용은 무엇인가요?`;
}

export function deriveInsightActions(evaluations: OpportunityEvaluation[]): InsightAction[] {
  return evaluations
    .flatMap((evaluation) => {
      const best = evaluation.actions
        .filter((item) => item.eligibility === "eligible" && item.valueScore != null)
        .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))[0];
      if (!best?.valueScore) return [];
      return [{
        slug: evaluation.slug,
        subGroup: evaluation.subGroup,
        actionType: best.actionType,
        valueScore: best.valueScore,
        confidence: evaluation.confidence,
        reason: best.reasons.join(" · "),
        targetPage: TARGET_PAGE_BY_CATEGORY[evaluation.slug],
      }];
    })
    .sort((a, b) => b.valueScore - a.valueScore);
}

export function buildPageUpdateOpportunities(
  _gaps: ContentGap[],
  evaluations: OpportunityEvaluation[],
): PageUpdateOpportunity[] {
  const groups = new Map<string, OpportunityEvaluation[]>();
  for (const evaluation of evaluations) {
    if (evaluation.pageContentStatus === "not-applicable" || evaluation.pageContentStatus === "covered") continue;
    const targetPage = TARGET_PAGE_BY_CATEGORY[evaluation.slug];
    const list = groups.get(targetPage) ?? [];
    list.push(evaluation);
    groups.set(targetPage, list);
  }

  return [...groups.entries()].flatMap(([targetPage, group]) => {
    const eligible = group.flatMap((evaluation) => {
      const pageAction = getActionEvaluation(evaluation, "page");
      if (pageAction?.eligibility !== "eligible" || pageAction.valueScore == null) return [];
      return [{ evaluation, valueScore: pageAction.valueScore }];
    }).sort((a, b) => b.valueScore - a.valueScore);
    if (eligible.length === 0) return [];
    const top = eligible[0].valueScore;
    const next = eligible.slice(1, 3);
    const nextAverage = next.length > 0 ? next.reduce((sum, item) => sum + item.valueScore, 0) / next.length : top;
    const representative = eligible[0].evaluation;
    const contributingTopics = eligible.map(({ evaluation, valueScore }) => ({
      topicKey: evaluation.key,
      subGroup: evaluation.subGroup,
      valueScore,
      status: evaluation.pageContentStatus as "promote-from-faq" | "missing",
      missingSections: evaluation.missingSections,
    }));
    const confirmationTopics = group
      .filter((evaluation) => evaluation.pageContentStatus === "needs-confirmation")
      .map((evaluation) => ({ topicKey: evaluation.key, subGroup: evaluation.subGroup }));
    return [{
      slug: representative.slug,
      subGroup: "통합 페이지 보강",
      targetPage,
      pageValueScore: Math.round(top * 0.7 + nextAverage * 0.3),
      missingSections: [...new Set(contributingTopics.flatMap((topic) => topic.missingSections))],
      recommendedBlocks: [...new Set(eligible.flatMap(({ evaluation }) => evaluation.recommendedBlocks))],
      contributingTopics,
      confirmationTopics,
    }];
  }).sort((a, b) => b.pageValueScore - a.pageValueScore);
}

export function generateFaqSuggestions(
  gaps: ContentGap[],
  evaluations: OpportunityEvaluation[],
): FaqSuggestion[] {
  const byKey = evaluationMap(evaluations);
  return gaps.flatMap((gap) => {
    const evaluation = byKey.get(`${gap.slug}:${gap.subGroup}`);
    const action = evaluation ? getActionEvaluation(evaluation, "faq") : null;
    if (!action || action.eligibility !== "eligible" || action.valueScore == null) return [];
    return [{
      slug: gap.slug,
      subGroup: gap.subGroup,
      question: inferQuestion(gap),
      valueScore: action.valueScore,
      keywords: [getPrimaryKeyword(gap), ...gap.keywords].slice(0, 4),
      targetPage: TARGET_PAGE_BY_CATEGORY[gap.slug],
    }];
  }).sort((a, b) => b.valueScore - a.valueScore);
}
