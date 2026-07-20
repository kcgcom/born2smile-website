import { CONCEPT_SATISFACTION_VERSION, type ConceptSatisfactionReport, type ConceptSatisfactionResult } from "./concept-satisfaction";
import { assessActionValue, conceptNeedScore, type ActionValueInput } from "./action-value";
import type { ActionRecommendation, ContentActionType, CoverageTopicSpec } from "./types";

export const ACTION_RECOMMENDATION_VERSION = "action-recommendation-v1" as const;

export interface ActionRecommendationReport {
  schemaVersion: typeof ACTION_RECOMMENDATION_VERSION;
  satisfactionVersion: typeof CONCEPT_SATISFACTION_VERSION;
  retrievalVersion: string;
  assessmentInput: {
    version: string;
    source: "reviewed-baseline" | "baseline-with-admin-overrides" | "baseline-with-reevaluation" | "baseline-with-admin-overrides-and-reevaluation" | "static-evaluation";
    baselineReviewedAt: string;
    adminOverrideCount: number;
    latestAdminReviewAt: string | null;
    completedReevaluationCount: number;
    latestReevaluationAt: string | null;
    topicReevaluationVersions: Record<string, string>;
  };
  recommendations: ActionRecommendation[];
}

function actionTypeFor(spec: CoverageTopicSpec): ContentActionType {
  if (spec.actionPolicy.primarySurface === "treatment-page") return "update-treatment-page";
  if (spec.actionPolicy.primarySurface === "faq") return "add-faq";
  if (spec.actionPolicy.primarySurface === "blog") return "create-blog";
  return "refresh-content";
}

function assertAllowed(spec: CoverageTopicSpec, actionType: ContentActionType) {
  if (!spec.actionPolicy.allowedActions.includes(actionType)) throw new Error(`${spec.id}에서 허용되지 않은 행동입니다: ${actionType}`);
}

function statusSummary(results: ConceptSatisfactionResult[]): string {
  const counts = {
    covered: results.filter((result) => result.provisionalStatus === "covered").length,
    partial: results.filter((result) => result.provisionalStatus === "partial").length,
    missing: results.filter((result) => result.provisionalStatus === "missing").length,
    notEvaluated: results.filter((result) => result.provisionalStatus === "not-evaluated").length,
  };
  return `잠정 충족 ${counts.covered}개, 부분 ${counts.partial}개, 누락 ${counts.missing}개, 미평가 ${counts.notEvaluated}개`;
}

function conceptIds(results: ConceptSatisfactionResult[], status: ConceptSatisfactionResult["provisionalStatus"]): string[] {
  return results.filter((result) => result.provisionalStatus === status).map((result) => result.conceptId);
}

function urgencyFor(results: ConceptSatisfactionResult[], specs: CoverageTopicSpec[]): ActionRecommendation["urgency"] {
  const importance = new Map(specs.flatMap((spec) => spec.concepts.map((concept) => [`${spec.id}:${concept.id}`, concept.importance])));
  if (results.some((result) => result.provisionalStatus === "missing" && importance.get(`${result.topicSpecId}:${result.conceptId}`) === "required")) return "high";
  if (results.some((result) => result.provisionalStatus === "partial" && importance.get(`${result.topicSpecId}:${result.conceptId}`) === "required")) return "normal";
  return "low";
}

export function buildActionRecommendations(
  specs: CoverageTopicSpec[],
  satisfaction: ConceptSatisfactionReport,
  assessmentInput: ActionRecommendationReport["assessmentInput"] = {
    version: `static-evaluation:${satisfaction.retrievalVersion}:${satisfaction.reviewedAt}`,
    source: "static-evaluation",
    baselineReviewedAt: satisfaction.reviewedAt,
    adminOverrideCount: 0,
    latestAdminReviewAt: null,
    completedReevaluationCount: 0,
    latestReevaluationAt: null,
    topicReevaluationVersions: {},
  },
  valueInputs: Record<string, ActionValueInput> = {},
): ActionRecommendationReport {
  if (satisfaction.schemaVersion !== CONCEPT_SATISFACTION_VERSION) throw new Error("지원하지 않는 개념 충족 판정입니다.");
  const recommendations: ActionRecommendation[] = [];

  for (const spec of specs) {
    const results = satisfaction.results.filter((result) => result.topicSpecId === spec.id);
    if (results.length !== spec.concepts.length) throw new Error(`${spec.id}의 개념 충족 판정 수가 명세와 다릅니다.`);
    const missingConcepts = conceptIds(results, "missing");
    const partialConcepts = conceptIds(results, "partial");
    const notEvaluatedConcepts = conceptIds(results, "not-evaluated");
    const actionable = results.filter((result) => result.provisionalStatus === "missing" || result.provisionalStatus === "partial");
    const plannedActionType = actionTypeFor(spec);
    const topicValueAssessment = actionable.length > 0
      ? assessActionValue(plannedActionType, conceptNeedScore(spec, results), valueInputs[spec.id])
      : null;
    const summary = statusSummary(results);
    let evidenceReviewActionKey: string | null = null;
    let reviewActionKey: string | null = null;

    if (notEvaluatedConcepts.length > 0) {
      assertAllowed(spec, "evidence-review");
      evidenceReviewActionKey = `${ACTION_RECOMMENDATION_VERSION}:${spec.id}:evidence-review`;
      recommendations.push({
        actionKey: evidenceReviewActionKey,
        topicSpecId: spec.id,
        title: `${spec.label}의 미평가 근거를 다시 검색`,
        actionType: "evidence-review",
        targetPath: spec.actionPolicy.primaryTargetPath,
        why: "근거 검색과 검토가 충분하지 않아 콘텐츠 공백 여부를 판정할 수 없습니다.",
        missingConcepts: [],
        partialConcepts: [],
        needsReviewConcepts: notEvaluatedConcepts,
        currentEvidenceSummary: summary,
        valueScore: topicValueAssessment?.score ?? null,
        valueAssessment: topicValueAssessment,
        confidence: "high",
        effort: "small",
        urgency: "normal",
        blockedBy: [],
        reassessAfterCompletion: true,
      });
    }

    if (results.some((result) => result.requiresClinicalReview)) {
      assertAllowed(spec, "clinical-review");
      reviewActionKey = `${ACTION_RECOMMENDATION_VERSION}:${spec.id}:clinical-review`;
      recommendations.push({
        actionKey: reviewActionKey,
        topicSpecId: spec.id,
        title: `${spec.label} 근거를 의료진이 검토`,
        actionType: "clinical-review",
        targetPath: spec.actionPolicy.primaryTargetPath,
        why: "임상 개념의 사전 라벨을 콘텐츠 수정 전에 의료진이 확인해야 합니다.",
        missingConcepts,
        partialConcepts,
        needsReviewConcepts: results.map((result) => result.conceptId),
        currentEvidenceSummary: summary,
        valueScore: topicValueAssessment?.score ?? null,
        valueAssessment: topicValueAssessment,
        confidence: "high",
        effort: "small",
        urgency: urgencyFor(results, specs),
        blockedBy: evidenceReviewActionKey ? [{
          actionKey: evidenceReviewActionKey,
          type: "should-complete-before",
          reason: "미평가 개념의 근거를 먼저 확보하면 의료진 검토 범위를 정확히 정할 수 있습니다.",
        }] : [],
        reassessAfterCompletion: true,
      });
    }

    if (actionable.length > 0) {
      const actionType = plannedActionType;
      assertAllowed(spec, actionType);
      const valueAssessment = topicValueAssessment!;
      recommendations.push({
        actionKey: `${ACTION_RECOMMENDATION_VERSION}:${spec.id}:${actionType}${assessmentInput.topicReevaluationVersions[spec.id] ? `:${assessmentInput.topicReevaluationVersions[spec.id]}` : ""}`,
        topicSpecId: spec.id,
        title: `${spec.label}의 부족한 개념을 ${spec.actionPolicy.primarySurface === "faq" ? "FAQ에 보강" : "기본 페이지에 보강"}`,
        actionType,
        targetPath: spec.actionPolicy.primaryTargetPath,
        why: missingConcepts.length > 0 && partialConcepts.length > 0
          ? `명시적 근거가 없는 개념 ${missingConcepts.length}개와 부분 근거 ${partialConcepts.length}개를 함께 보강해야 합니다.`
          : missingConcepts.length > 0 ? `명시적 근거가 없는 개념 ${missingConcepts.length}개를 보강해야 합니다.`
            : `부분 근거 ${partialConcepts.length}개를 완전 충족으로 만들 설명이 필요합니다.`,
        missingConcepts,
        partialConcepts,
        needsReviewConcepts: reviewActionKey ? actionable.map((result) => result.conceptId) : [],
        currentEvidenceSummary: summary,
        valueScore: valueAssessment.score,
        valueAssessment,
        confidence: reviewActionKey ? "low" : "medium",
        effort: actionType === "update-treatment-page" || actionType === "create-blog" ? "medium" : "small",
        urgency: urgencyFor(actionable, specs),
        blockedBy: reviewActionKey ? [{
          actionKey: reviewActionKey,
          type: "must-complete-before",
          reason: "의료진 검토 결과에 따라 실제 보강 범위와 표현이 달라집니다.",
        }] : [],
        reassessAfterCompletion: true,
      });
    } else if (!reviewActionKey && notEvaluatedConcepts.length === 0) {
      assertAllowed(spec, "no-action");
      recommendations.push({
        actionKey: `${ACTION_RECOMMENDATION_VERSION}:${spec.id}:no-action`,
        topicSpecId: spec.id,
        title: `${spec.label}은 현재 콘텐츠 유지`,
        actionType: "no-action",
        targetPath: spec.actionPolicy.primaryTargetPath,
        why: "검토된 모든 개념에 직접 충족 근거가 있습니다.",
        missingConcepts: [],
        partialConcepts: [],
        needsReviewConcepts: [],
        currentEvidenceSummary: summary,
        valueScore: null,
        valueAssessment: null,
        confidence: "medium",
        effort: "small",
        urgency: "low",
        blockedBy: [],
        reassessAfterCompletion: false,
      });
    }
  }

  return {
    schemaVersion: ACTION_RECOMMENDATION_VERSION,
    satisfactionVersion: satisfaction.schemaVersion,
    retrievalVersion: satisfaction.retrievalVersion,
    assessmentInput,
    recommendations,
  };
}
