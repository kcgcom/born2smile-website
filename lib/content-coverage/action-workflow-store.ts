import type { ContentPlannerItem, PlannerItemType, PlannerPriority } from "../content-planner";
import { mapPlannerRow } from "../content-planner";
import { getSupabaseAdmin } from "../supabase-admin";
import { ACTION_RECOMMENDATION_VERSION } from "./action-recommendation";
import { getCurrentActionRecommendationReport } from "./action-recommendation-data";
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
}

const REVIEW_ACTIONS = new Set<ContentActionType>(["clinical-review", "evidence-review"]);
const PROMOTABLE_ACTIONS = new Set<ContentActionType>([
  "create-blog", "update-blog", "update-treatment-page", "add-faq", "update-faq", "promote-faq-to-page", "refresh-content", "resolve-conflict",
]);

function cacheKey(retrievalVersion: string) {
  return `content-coverage:action-workflow:${ACTION_RECOMMENDATION_VERSION}:${retrievalVersion}`;
}

async function loadSavedData(retrievalVersion: string): Promise<SavedActionWorkflowData> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", cacheKey(retrievalVersion)).maybeSingle();
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

export async function getActionWorkflowData() {
  const report = getCurrentActionRecommendationReport();
  const saved = await loadSavedData(report.retrievalVersion);
  const plannerItems = await loadPlannerItems(report.recommendations.map((item) => item.actionKey));
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
    };
  });
  return {
    schemaVersion: report.schemaVersion,
    retrievalVersion: report.retrievalVersion,
    recommendations,
    stats: {
      total: recommendations.length,
      reviewsPending: recommendations.filter((item) => item.canCompleteReview && item.reviewState?.status !== "completed").length,
      ready: recommendations.filter((item) => item.canPromote).length,
      blocked: recommendations.filter((item) => PROMOTABLE_ACTIONS.has(item.actionType) && item.unresolvedBlockerKeys.length > 0).length,
      promoted: recommendations.filter((item) => item.plannerItem != null).length,
    },
  };
}

export async function saveActionReviewState(
  actionKey: string,
  input: { status: ActionReviewStatus; notes: string },
  updatedBy: string,
) {
  const workflow = await getActionWorkflowData();
  const recommendation = workflow.recommendations.find((item) => item.actionKey === actionKey);
  if (!recommendation) throw new Error("ACTION_NOT_FOUND");
  if (!REVIEW_ACTIONS.has(recommendation.actionType)) throw new Error("ACTION_NOT_REVIEWABLE");
  if (input.status === "completed" && input.notes.trim().length < 2) throw new Error("REVIEW_NOTES_REQUIRED");
  if (input.status === "pending") {
    const promotedDependency = workflow.recommendations.some((item) =>
      item.plannerItem != null && item.blockedBy.some((blocker) => blocker.actionKey === actionKey && blocker.type === "must-complete-before"));
    if (promotedDependency) throw new Error("REVIEW_HAS_PROMOTED_DEPENDENCY");
  }
  const saved = await loadSavedData(workflow.retrievalVersion);
  const reviewState: SavedActionReviewState = { ...input, notes: input.notes.trim(), updatedAt: new Date().toISOString(), updatedBy };
  saved.reviewStates[actionKey] = reviewState;
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: cacheKey(workflow.retrievalVersion),
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

function plannerPriority(urgency: ActionRecommendation["urgency"]): PlannerPriority {
  if (urgency === "critical" || urgency === "high") return "now";
  if (urgency === "normal") return "next";
  return "watch";
}

export async function promoteActionToPlanner(actionKey: string, createdBy: string) {
  const workflow = await getActionWorkflowData();
  const item = workflow.recommendations.find((recommendation) => recommendation.actionKey === actionKey);
  if (!item) throw new Error("ACTION_NOT_FOUND");
  if (!PROMOTABLE_ACTIONS.has(item.actionType)) throw new Error("ACTION_NOT_PROMOTABLE");
  if (item.unresolvedBlockerKeys.length > 0) throw new Error("ACTION_BLOCKED");
  if (item.plannerItem) return item.plannerItem;
  const spec = COVERAGE_TOPIC_SPECS.find((candidate) => candidate.id === item.topicSpecId);
  if (!spec) throw new Error("TOPIC_NOT_FOUND");
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from("content_planner_items").upsert({
    opportunity_key: item.actionKey,
    item_type: plannerItemType(item.actionType),
    title: item.title,
    category: spec.label,
    target_page: item.targetPath,
    status: "approved",
    priority: plannerPriority(item.urgency),
    rationale: item.why,
    brief: {
      actionType: item.actionType,
      missingConcepts: item.missingConcepts,
      partialConcepts: item.partialConcepts,
      currentEvidenceSummary: item.currentEvidenceSummary,
      reassessAfterCompletion: item.reassessAfterCompletion,
    },
    source_snapshot: {
      schemaVersion: workflow.schemaVersion,
      retrievalVersion: workflow.retrievalVersion,
      actionKey: item.actionKey,
    },
    due_date: null,
    created_by: createdBy,
    updated_at: now,
  }, { onConflict: "opportunity_key" }).select("*").single();
  if (error) throw error;
  return mapPlannerRow(data);
}
