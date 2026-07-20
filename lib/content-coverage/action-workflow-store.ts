import type { ContentPlannerItem, PlannerItemType, PlannerPriority } from "../content-planner";
import { mapPlannerRow } from "../content-planner";
import { getSupabaseAdmin } from "../supabase-admin";
import { ACTION_RECOMMENDATION_VERSION } from "./action-recommendation";
import { getCurrentActionRecommendationReport } from "./action-recommendation-data";
import { getCurrentTargetEvidenceRevision } from "./operational-evidence";
import { listContentReevaluationStates, type ContentReevaluationState } from "./reevaluation-store";
import { COVERAGE_TOPIC_SPECS } from "./topic-specs";
import type { ActionRecommendation, ContentActionType } from "./types";

export type ActionReviewStatus = "pending" | "completed";

export interface SavedActionReviewState {
  status: ActionReviewStatus;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

interface SavedActionWorkflowData {
  reviewStates: Record<string, SavedActionReviewState>;
}

export interface ActionWorkflowItem extends ActionRecommendation {
  reviewState: SavedActionReviewState | null;
  unresolvedBlockerKeys: string[];
  canCompleteReview: boolean;
  canPromote: boolean;
  plannerItem: ContentPlannerItem | null;
  reevaluationState: ContentReevaluationState | null;
}

export interface ActionValueAuditItem {
  actionKey: string;
  topicSpecId: string;
  title: string;
  actionType: ContentActionType;
  urgency: ActionRecommendation["urgency"];
  priority: PlannerPriority;
  score: number | null;
  demandScore: number | null;
  conceptNeedScore: number;
  patientBusinessValue: number | null;
  strategicFit: number | null;
  monthlyVolume: number | null;
  baseRank: number | null;
  demandEmphasisRank: number | null;
  conceptNeedEmphasisRank: number | null;
  maxRankShift: number;
}

export interface ActionValueAudit {
  modelVersion: string | null;
  sourceVersion: string | null;
  sourceUpdatedAt: string | null;
  taxonomyVersion: number | null;
  volumeCoverage: number;
  dataStatus: NonNullable<ActionRecommendation["valueAssessment"]>["dataStatus"] | "no-actions";
  stats: {
    total: number;
    scored: number;
    held: number;
    average: number | null;
    median: number | null;
    minimum: number | null;
    maximum: number | null;
    now: number;
    next: number;
    watch: number;
    rankSensitive: number;
  };
  warnings: string[];
  items: ActionValueAuditItem[];
}

const REVIEW_ACTIONS = new Set<ContentActionType>(["clinical-review", "evidence-review"]);
const PROMOTABLE_ACTIONS = new Set<ContentActionType>([
  "create-blog", "update-blog", "update-treatment-page", "add-faq", "update-faq", "promote-faq-to-page", "refresh-content", "resolve-conflict",
]);

function cacheKey(retrievalVersion: string, assessmentInputVersion: string) {
  return `content-coverage:action-workflow:${ACTION_RECOMMENDATION_VERSION}:${retrievalVersion}:${assessmentInputVersion}`;
}

async function loadSavedData(retrievalVersion: string, assessmentInputVersion: string): Promise<SavedActionWorkflowData> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", cacheKey(retrievalVersion, assessmentInputVersion)).maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedActionWorkflowData> | null;
  return { reviewStates: saved?.reviewStates && typeof saved.reviewStates === "object" ? saved.reviewStates : {} };
}

async function loadPlannerItems(actionKeys: string[]): Promise<Map<string, ContentPlannerItem>> {
  if (actionKeys.length === 0) return new Map();
  const { data, error } = await getSupabaseAdmin().from("content_planner_items").select("*").in("opportunity_key", actionKeys);
  if (error) throw error;
  return new Map((data ?? []).map((row) => {
    const item = mapPlannerRow(row);
    return [item.opportunityKey, item];
  }));
}

function rankMap(items: ActionRecommendation[], scoreFor: (item: ActionRecommendation) => number | null) {
  return new Map(items
    .map((item) => ({ item, score: scoreFor(item) }))
    .filter((entry): entry is { item: ActionRecommendation; score: number } => entry.score != null)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "ko"))
    .map((entry, index) => [entry.item.actionKey, index + 1]));
}

export function buildActionValueAudit(recommendations: ActionRecommendation[], now = new Date()): ActionValueAudit {
  const contentActions = recommendations.filter((item) => PROMOTABLE_ACTIONS.has(item.actionType) && item.valueAssessment != null);
  const baseRanks = rankMap(contentActions, (item) => item.valueScore);
  const demandRanks = rankMap(contentActions, (item) => item.valueAssessment?.sensitivity?.demandEmphasisScore ?? null);
  const conceptNeedRanks = rankMap(contentActions, (item) => item.valueAssessment?.sensitivity?.conceptNeedEmphasisScore ?? null);
  const items = contentActions.map((item): ActionValueAuditItem => {
    const assessment = item.valueAssessment!;
    const baseRank = baseRanks.get(item.actionKey) ?? null;
    const demandEmphasisRank = demandRanks.get(item.actionKey) ?? null;
    const conceptNeedEmphasisRank = conceptNeedRanks.get(item.actionKey) ?? null;
    const comparableRanks = [demandEmphasisRank, conceptNeedEmphasisRank].filter((rank): rank is number => rank != null && baseRank != null);
    const maxRankShift = baseRank == null || comparableRanks.length === 0
      ? 0
      : Math.max(...comparableRanks.map((rank) => Math.abs(rank - baseRank)));
    return {
      actionKey: item.actionKey,
      topicSpecId: item.topicSpecId,
      title: item.title,
      actionType: item.actionType,
      urgency: item.urgency,
      priority: plannerPriority(item.urgency, item.valueScore),
      score: item.valueScore,
      demandScore: assessment.demandScore,
      conceptNeedScore: assessment.conceptNeedScore,
      patientBusinessValue: assessment.patientBusinessValue,
      strategicFit: assessment.strategicFit,
      monthlyVolume: assessment.monthlyVolume,
      baseRank,
      demandEmphasisRank,
      conceptNeedEmphasisRank,
      maxRankShift,
    };
  }).sort((a, b) => (a.baseRank ?? Number.MAX_SAFE_INTEGER) - (b.baseRank ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "ko"));
  const scoredValues = items.flatMap((item) => item.score == null ? [] : [item.score]).sort((a, b) => a - b);
  const priorities = items.map((item) => item.priority);
  const metadata = contentActions[0]?.valueAssessment ?? null;
  const median = scoredValues.length === 0
    ? null
    : scoredValues.length % 2 === 1
      ? scoredValues[Math.floor(scoredValues.length / 2)]
      : Math.round((scoredValues[scoredValues.length / 2 - 1] + scoredValues[scoredValues.length / 2]) / 2);
  const warnings: string[] = [];
  if (contentActions.length > 0 && contentActions.length < 10) warnings.push(`현재 표본이 ${contentActions.length}개로 작아 가중치와 임계값을 자동 보정하지 않습니다.`);
  if (metadata?.dataStatus !== "ready") warnings.push("검색량 입력이 준비되지 않아 일부 또는 전체 실행 가치가 보류되었습니다.");
  if (items.some((item) => item.score == null)) warnings.push(`${items.filter((item) => item.score == null).length}개 작업은 비교 가능한 검색량이 없어 점수를 보류했습니다.`);
  if (metadata?.sourceUpdatedAt && now.getTime() - new Date(metadata.sourceUpdatedAt).getTime() > 35 * 24 * 60 * 60 * 1000) warnings.push("SearchAd 스냅샷이 35일보다 오래되었습니다. 점수 보정 전에 데이터를 갱신하세요.");
  const rankSensitive = items.filter((item) => item.maxRankShift > 0).length;
  if (rankSensitive > 0) warnings.push(`${rankSensitive}개 작업은 가중치 ±10%p 변화에 따라 순위가 바뀝니다.`);

  return {
    modelVersion: metadata?.modelVersion ?? null,
    sourceVersion: metadata?.sourceVersion ?? null,
    sourceUpdatedAt: metadata?.sourceUpdatedAt ?? null,
    taxonomyVersion: metadata?.taxonomyVersion ?? null,
    volumeCoverage: metadata?.volumeCoverage ?? 0,
    dataStatus: metadata?.dataStatus ?? "no-actions",
    stats: {
      total: items.length,
      scored: scoredValues.length,
      held: items.length - scoredValues.length,
      average: scoredValues.length > 0 ? Math.round(scoredValues.reduce((sum, score) => sum + score, 0) / scoredValues.length) : null,
      median,
      minimum: scoredValues[0] ?? null,
      maximum: scoredValues.at(-1) ?? null,
      now: priorities.filter((priority) => priority === "now").length,
      next: priorities.filter((priority) => priority === "next").length,
      watch: priorities.filter((priority) => priority === "watch").length,
      rankSensitive,
    },
    warnings,
    items,
  };
}

export async function getActionWorkflowData() {
  const report = await getCurrentActionRecommendationReport();
  const actionKeys = report.recommendations.map((item) => item.actionKey);
  const [saved, plannerItems, reevaluationStates] = await Promise.all([
    loadSavedData(report.retrievalVersion, report.assessmentInput.version),
    loadPlannerItems(actionKeys),
    listContentReevaluationStates(),
  ]);
  const reevaluationByActionKey = new Map(reevaluationStates.map((state) => [state.actionKey, state]));
  const latestCompletedByTopic = new Map<string, ContentReevaluationState>();
  for (const state of reevaluationStates.filter((candidate) => candidate.status === "completed" && candidate.topicSpecId)) {
    const current = latestCompletedByTopic.get(state.topicSpecId!);
    if (!current || (state.completedAt ?? state.requestedAt) > (current.completedAt ?? current.requestedAt)) latestCompletedByTopic.set(state.topicSpecId!, state);
  }
  const recommendations: ActionWorkflowItem[] = report.recommendations.map((recommendation) => {
    const reviewState = saved.reviewStates[recommendation.actionKey] ?? null;
    const unresolvedBlockerKeys = recommendation.blockedBy
      .filter((blocker) => blocker.type === "must-complete-before")
      .map((blocker) => blocker.actionKey)
      .filter((actionKey) => saved.reviewStates[actionKey]?.status !== "completed");
    const plannerItem = plannerItems.get(recommendation.actionKey) ?? null;
    return {
      ...recommendation,
      reviewState,
      unresolvedBlockerKeys,
      canCompleteReview: REVIEW_ACTIONS.has(recommendation.actionType),
      canPromote: PROMOTABLE_ACTIONS.has(recommendation.actionType) && unresolvedBlockerKeys.length === 0 && plannerItem == null,
      plannerItem,
      reevaluationState: reevaluationByActionKey.get(recommendation.actionKey)
        ?? latestCompletedByTopic.get(recommendation.topicSpecId) ?? null,
    };
  });
  return {
    schemaVersion: report.schemaVersion,
    retrievalVersion: report.retrievalVersion,
    assessmentInput: report.assessmentInput,
    recommendations,
    valueAudit: buildActionValueAudit(recommendations),
    stats: {
      total: recommendations.length,
      reviewsPending: recommendations.filter((item) => item.canCompleteReview && item.reviewState?.status !== "completed").length,
      ready: recommendations.filter((item) => item.canPromote).length,
      blocked: recommendations.filter((item) => PROMOTABLE_ACTIONS.has(item.actionType) && item.unresolvedBlockerKeys.length > 0).length,
      promoted: recommendations.filter((item) => item.plannerItem != null).length,
      reevaluationPending: recommendations.filter((item) => item.reevaluationState != null
        && item.reevaluationState.status !== "cancelled" && item.reevaluationState.status !== "completed").length,
    },
  };
}

export async function saveActionReviewState(
  actionKey: string,
  input: { status: ActionReviewStatus; notes: string },
  updatedBy: string,
  expectedAssessmentInputVersion: string,
) {
  const workflow = await getActionWorkflowData();
  if (workflow.assessmentInput.version !== expectedAssessmentInputVersion) throw new Error("ASSESSMENT_INPUT_STALE");
  const recommendation = workflow.recommendations.find((item) => item.actionKey === actionKey);
  if (!recommendation) throw new Error("ACTION_NOT_FOUND");
  if (!REVIEW_ACTIONS.has(recommendation.actionType)) throw new Error("ACTION_NOT_REVIEWABLE");
  if (input.status === "completed" && input.notes.trim().length < 2) throw new Error("REVIEW_NOTES_REQUIRED");
  if (input.status === "pending") {
    const promotedDependency = workflow.recommendations.some((item) =>
      item.plannerItem != null && item.blockedBy.some((blocker) => blocker.actionKey === actionKey && blocker.type === "must-complete-before"));
    if (promotedDependency) throw new Error("REVIEW_HAS_PROMOTED_DEPENDENCY");
  }
  const saved = await loadSavedData(workflow.retrievalVersion, workflow.assessmentInput.version);
  const reviewState: SavedActionReviewState = { ...input, notes: input.notes.trim(), updatedAt: new Date().toISOString(), updatedBy };
  saved.reviewStates[actionKey] = reviewState;
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: cacheKey(workflow.retrievalVersion, workflow.assessmentInput.version),
    data: saved,
    fetched_at: reviewState.updatedAt,
  });
  if (error) throw error;
  return reviewState;
}

function plannerItemType(actionType: ContentActionType): PlannerItemType {
  if (actionType === "add-faq" || actionType === "update-faq" || actionType === "promote-faq-to-page") return "faq";
  if (actionType === "create-blog" || actionType === "update-blog") return "blog";
  return "page";
}

function plannerPriority(urgency: ActionRecommendation["urgency"], valueScore: number | null): PlannerPriority {
  if (urgency === "critical" || urgency === "high") return "now";
  if (valueScore != null && valueScore >= 70) return "now";
  if (valueScore != null && valueScore >= 45) return "next";
  if (urgency === "normal") return "next";
  return "watch";
}

export async function promoteActionToPlanner(actionKey: string, createdBy: string, expectedAssessmentInputVersion: string) {
  const workflow = await getActionWorkflowData();
  if (workflow.assessmentInput.version !== expectedAssessmentInputVersion) throw new Error("ASSESSMENT_INPUT_STALE");
  const item = workflow.recommendations.find((recommendation) => recommendation.actionKey === actionKey);
  if (!item) throw new Error("ACTION_NOT_FOUND");
  if (!PROMOTABLE_ACTIONS.has(item.actionType)) throw new Error("ACTION_NOT_PROMOTABLE");
  if (item.unresolvedBlockerKeys.length > 0) throw new Error("ACTION_BLOCKED");
  if (item.plannerItem) return item.plannerItem;
  const spec = COVERAGE_TOPIC_SPECS.find((candidate) => candidate.id === item.topicSpecId);
  if (!spec) throw new Error("TOPIC_NOT_FOUND");
  const targetEvidenceRevision = await getCurrentTargetEvidenceRevision(item.targetPath);
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from("content_planner_items").upsert({
    opportunity_key: item.actionKey,
    item_type: plannerItemType(item.actionType),
    title: item.title,
    category: spec.label,
    target_page: item.targetPath,
    status: "approved",
    priority: plannerPriority(item.urgency, item.valueScore),
    rationale: item.why,
    brief: {
      actionType: item.actionType,
      missingConcepts: item.missingConcepts,
      partialConcepts: item.partialConcepts,
      currentEvidenceSummary: item.currentEvidenceSummary,
      valueScore: item.valueScore,
      valueAssessment: item.valueAssessment,
      reassessAfterCompletion: item.reassessAfterCompletion,
    },
    source_snapshot: {
      schemaVersion: workflow.schemaVersion,
      retrievalVersion: workflow.retrievalVersion,
      assessmentInputVersion: workflow.assessmentInput.version,
      topicSpecId: item.topicSpecId,
      targetEvidenceRevision,
      actionKey: item.actionKey,
      valueAssessment: item.valueAssessment,
    },
    due_date: null,
    created_by: createdBy,
    updated_at: now,
  }, { onConflict: "opportunity_key" }).select("*").single();
  if (error) throw error;
  return mapPlannerRow(data);
}
