import type { ContentPlannerItem } from "../content-planner";
import { getSupabaseAdmin } from "../supabase-admin";
import type { ConceptReviewSeed, ConceptSupportLabel } from "./concept-review";
import { getCurrentTargetEvidenceRevision } from "./operational-evidence";
import type { RetrievalReviewLabel } from "./retrieval-evaluation";

export const CONTENT_REEVALUATION_VERSION = "content-reevaluation-v1" as const;

export type ContentReevaluationStatus = "awaiting-content-change" | "pending-evidence-refresh" | "processing" | "needs-review" | "completed" | "failed" | "cancelled";

export interface ContentReevaluationState {
  schemaVersion: typeof CONTENT_REEVALUATION_VERSION;
  actionKey: string;
  plannerItemId: string;
  topicSpecId: string | null;
  targetPath: string;
  assessmentInputVersion: string | null;
  baselineRevision: string | null;
  observedRevision: string | null;
  status: ContentReevaluationStatus;
  reason: string;
  requestedAt: string;
  requestedBy: string;
  updatedAt: string;
  processingAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  candidateSet: ConceptReviewSeed | null;
  completedAt: string | null;
  completedBy: string | null;
  error: string | null;
}

function cacheKey(actionKey: string) {
  return `content-coverage:reevaluation:${CONTENT_REEVALUATION_VERSION}:${actionKey}`;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isContentCoveragePlannerItem(item: ContentPlannerItem): boolean {
  return item.sourceSnapshot.schemaVersion === "action-recommendation-v1"
    && typeof item.sourceSnapshot.actionKey === "string";
}

export function contentCoverageActionKey(item: ContentPlannerItem): string | null {
  return isContentCoveragePlannerItem(item) ? stringValue(item.sourceSnapshot.actionKey) : null;
}

export function buildContentReevaluationState(
  item: ContentPlannerItem,
  observedRevision: string | null,
  requestedBy: string,
  requestedAt = new Date().toISOString(),
): ContentReevaluationState {
  const baselineRevision = stringValue(item.sourceSnapshot.targetEvidenceRevision);
  const contentChanged = baselineRevision == null || observedRevision == null || baselineRevision !== observedRevision;
  return {
    schemaVersion: CONTENT_REEVALUATION_VERSION,
    actionKey: contentCoverageActionKey(item) ?? item.opportunityKey,
    plannerItemId: item.id,
    topicSpecId: stringValue(item.sourceSnapshot.topicSpecId),
    targetPath: item.targetPage,
    assessmentInputVersion: stringValue(item.sourceSnapshot.assessmentInputVersion),
    baselineRevision,
    observedRevision,
    status: contentChanged ? "pending-evidence-refresh" : "awaiting-content-change",
    reason: baselineRevision == null
      ? "기존 작업에 기준 콘텐츠 리비전이 없어 현재 근거를 다시 생성해야 합니다."
      : observedRevision == null ? "대상 경로의 현재 근거를 찾지 못해 콘텐츠 반영 여부를 확인해야 합니다."
        : contentChanged ? "작업 승인 시점과 다른 콘텐츠 리비전이 확인되어 근거 재검색이 필요합니다."
          : "작업 승인 이후 대상 콘텐츠 리비전이 바뀌지 않았습니다.",
    requestedAt,
    requestedBy,
    updatedAt: requestedAt,
    processingAt: null,
    cancelledAt: null,
    cancelledBy: null,
    candidateSet: null,
    completedAt: null,
    completedBy: null,
    error: null,
  };
}

async function loadState(actionKey: string): Promise<ContentReevaluationState | null> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", cacheKey(actionKey)).maybeSingle();
  if (error) throw error;
  const state = data?.data as ContentReevaluationState | null;
  return state?.schemaVersion === CONTENT_REEVALUATION_VERSION ? state : null;
}

async function persistState(state: ContentReevaluationState) {
  const next = { ...state, updatedAt: new Date().toISOString() };
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: cacheKey(next.actionKey),
    data: next,
    fetched_at: next.updatedAt,
  });
  if (error) throw error;
  return next;
}

export async function requestContentReevaluation(item: ContentPlannerItem, requestedBy: string) {
  if (!isContentCoveragePlannerItem(item)) return null;
  const observedRevision = await getCurrentTargetEvidenceRevision(item.targetPage);
  const next = buildContentReevaluationState(item, observedRevision, requestedBy);
  const existing = await loadState(next.actionKey);
  if (existing && existing.plannerItemId === next.plannerItemId && existing.observedRevision === next.observedRevision
    && existing.baselineRevision === next.baselineRevision && existing.status === next.status) return existing;
  return persistState(next);
}

export async function cancelContentReevaluation(item: ContentPlannerItem, cancelledBy: string) {
  if (!isContentCoveragePlannerItem(item)) return null;
  const actionKey = contentCoverageActionKey(item) ?? item.opportunityKey;
  const existing = await loadState(actionKey);
  if (!existing || existing.status === "cancelled") return existing;
  return persistState({
    ...existing,
    status: "cancelled",
    reason: "플래너 작업이 완료 상태에서 다시 열려 재평가 요청을 취소했습니다.",
    cancelledAt: new Date().toISOString(),
    cancelledBy,
  });
}

export async function loadContentReevaluationStates(actionKeys: string[]): Promise<Map<string, ContentReevaluationState>> {
  if (actionKeys.length === 0) return new Map();
  const keys = [...new Set(actionKeys)].map(cacheKey);
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").in("key", keys);
  if (error) throw error;
  const states = (data ?? []).flatMap((row) => {
    const state = row.data as ContentReevaluationState | null;
    return state?.schemaVersion === CONTENT_REEVALUATION_VERSION ? [state] : [];
  });
  return new Map(states.map((state) => [state.actionKey, state]));
}

export async function listContentReevaluationStates(): Promise<ContentReevaluationState[]> {
  const prefix = `content-coverage:reevaluation:${CONTENT_REEVALUATION_VERSION}:`;
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").like("key", `${prefix}%`);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const state = row.data as ContentReevaluationState | null;
    return state?.schemaVersion === CONTENT_REEVALUATION_VERSION ? [state] : [];
  }).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export async function claimContentReevaluation(actionKey?: string) {
  const states = await listContentReevaluationStates();
  const staleBefore = Date.now() - 30 * 60 * 1000;
  const target = [...states].reverse().find((state) => {
    const staleProcessing = state.status === "processing"
      && (!state.processingAt || new Date(state.processingAt).getTime() < staleBefore);
    return (state.status === "pending-evidence-refresh" || staleProcessing) && (!actionKey || state.actionKey === actionKey);
  });
  if (!target) return null;
  return persistState({ ...target, status: "processing", processingAt: new Date().toISOString(), error: null });
}

export async function completeContentReevaluationGeneration(actionKey: string, candidateSet: ConceptReviewSeed, observedRevision?: string | null) {
  const state = await loadState(actionKey);
  if (!state) throw new Error("REEVALUATION_NOT_FOUND");
  if (state.status !== "processing") throw new Error("REEVALUATION_NOT_PROCESSING");
  if (candidateSet.items.some((item) => item.topicSpecId !== state.topicSpecId)) throw new Error("REEVALUATION_TOPIC_MISMATCH");
  if (candidateSet.items.length === 0) throw new Error("REEVALUATION_EMPTY_CANDIDATES");
  return persistState({
    ...state,
    status: "needs-review",
    candidateSet,
    observedRevision: observedRevision === undefined ? state.observedRevision : observedRevision,
    processingAt: null,
    completedAt: null,
    completedBy: null,
    error: null,
  });
}

export async function failContentReevaluationGeneration(actionKey: string, message: string) {
  const state = await loadState(actionKey);
  if (!state) return null;
  return persistState({ ...state, status: "failed", processingAt: null, error: message.slice(0, 1000) });
}

export async function retryContentReevaluation(actionKey: string) {
  const state = await loadState(actionKey);
  if (!state) throw new Error("REEVALUATION_NOT_FOUND");
  if (state.status !== "failed") throw new Error("REEVALUATION_NOT_FAILED");
  return persistState({ ...state, status: "pending-evidence-refresh", processingAt: null, error: null });
}

export async function saveContentReevaluationReviewEntry(
  actionKey: string,
  id: string,
  input: {
    topicReviewLabel: Exclude<RetrievalReviewLabel, null>;
    conceptLabels: Record<string, ConceptSupportLabel>;
    notes: string;
  },
  reviewedBy: string,
) {
  const state = await loadState(actionKey);
  if (!state?.candidateSet) throw new Error("REEVALUATION_NOT_FOUND");
  if (state.status !== "needs-review") throw new Error("REEVALUATION_NOT_REVIEWABLE");
  const item = state.candidateSet.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error("REEVALUATION_ITEM_NOT_FOUND");
  const expectedConceptIds = [...item.conceptIds].sort();
  const receivedConceptIds = Object.keys(input.conceptLabels).sort();
  if (expectedConceptIds.join("|") !== receivedConceptIds.join("|")) throw new Error("REEVALUATION_LABEL_MISMATCH");
  const items = state.candidateSet.items.map((candidate) => candidate.id === id ? { ...candidate, ...input } : candidate);
  const complete = items.every((candidate) => candidate.topicReviewLabel != null
    && candidate.conceptIds.every((conceptId) => candidate.conceptLabels[conceptId] != null));
  const now = new Date().toISOString();
  const next = {
    ...state,
    status: complete ? "completed" as const : "needs-review" as const,
    reason: complete ? "새 근거 후보 검토를 완료해 최신 운영 판정에 반영했습니다." : state.reason,
    candidateSet: { ...state.candidateSet, items },
    completedAt: complete ? now : null,
    completedBy: complete ? reviewedBy : null,
  };
  await persistState(next);
  return next;
}

export function withContentReevaluationState(item: ContentPlannerItem, state: ContentReevaluationState | null): ContentPlannerItem {
  return state ? { ...item, sourceSnapshot: { ...item.sourceSnapshot, reevaluation: state } } : item;
}
