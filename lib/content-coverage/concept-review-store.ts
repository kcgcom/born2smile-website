import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "../supabase-admin";
import conceptReviewBaselineJson from "./generated/concept-review-baseline.json";
import conceptReviewSeedJson from "./generated/concept-review-seed.json";
import { applyConceptReviewBaseline, type ConceptReviewBaseline, type ConceptReviewSeed, type ConceptSupportLabel } from "./concept-review";
import { listContentReevaluationStates, type ContentReevaluationState } from "./reevaluation-store";
import type { RetrievalReviewLabel } from "./retrieval-evaluation";

const SEED = conceptReviewSeedJson as unknown as ConceptReviewSeed;
const BASELINE = conceptReviewBaselineJson as unknown as ConceptReviewBaseline;
const BASE_REVIEW = applyConceptReviewBaseline(SEED, BASELINE);
const CACHE_KEY = `content-coverage:concept-review:${SEED.retrievalVersion}:${SEED.schemaVersion}`;

export interface SavedConceptReviewEntry {
  topicReviewLabel: Exclude<RetrievalReviewLabel, null>;
  conceptLabels: Record<string, ConceptSupportLabel>;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

interface SavedConceptReviewData {
  labels: Record<string, SavedConceptReviewEntry>;
}

async function loadSavedData(): Promise<SavedConceptReviewData> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", CACHE_KEY).maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedConceptReviewData> | null;
  return { labels: saved?.labels && typeof saved.labels === "object" ? saved.labels : {} };
}

function validateConceptLabels(itemId: string, labels: Record<string, ConceptSupportLabel>) {
  const item = SEED.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("CONCEPT_REVIEW_ITEM_NOT_FOUND");
  const expected = [...item.conceptIds].sort();
  const received = Object.keys(labels).sort();
  if (expected.length !== received.length || expected.some((conceptId, index) => conceptId !== received[index])) {
    throw new Error("CONCEPT_REVIEW_LABEL_MISMATCH");
  }
  return item;
}

export async function getConceptReviewData() {
  return (await getOperationalConceptReviewSnapshot()).review;
}

export async function getOperationalConceptReviewSnapshot() {
  const [saved, reevaluations] = await Promise.all([loadSavedData(), listContentReevaluationStates()]);
  return buildOperationalConceptReviewSnapshot(saved.labels, reevaluations);
}

export function buildOperationalConceptReviewSnapshot(
  savedLabels: Record<string, SavedConceptReviewEntry>,
  reevaluations: ContentReevaluationState[] = [],
) {
  let items = BASE_REVIEW.items.map((item) => {
    const entry = savedLabels[item.id];
    return entry ? { ...item, ...entry } : item;
  });
  const latestCompletedByTopic = new Map<string, ContentReevaluationState>();
  for (const state of reevaluations.filter((candidate) => candidate.status === "completed" && candidate.candidateSet && candidate.topicSpecId)) {
    const current = latestCompletedByTopic.get(state.topicSpecId!);
    if (!current || (state.completedAt ?? state.requestedAt) > (current.completedAt ?? current.requestedAt)) {
      latestCompletedByTopic.set(state.topicSpecId!, state);
    }
  }
  for (const [topicSpecId, state] of latestCompletedByTopic) {
    items = [...items.filter((item) => item.topicSpecId !== topicSpecId), ...state.candidateSet!.items];
  }
  const overrides = BASE_REVIEW.items.flatMap((item) => savedLabels[item.id] ? [savedLabels[item.id]] : []);
  const completedReevaluations = [...latestCompletedByTopic.values()];
  const review = {
    ...BASE_REVIEW,
    generatedAt: completedReevaluations.map((state) => state.candidateSet!.generatedAt).sort().at(-1) ?? BASE_REVIEW.generatedAt,
    items,
  };
  const inputPayload = [...items].sort((left, right) => left.id.localeCompare(right.id)).map((item) => ({
    id: item.id,
    evidenceFingerprint: item.evidenceContentHash ?? createHash("sha256").update(`${item.headingPath.join("|")}\n${item.excerpt}`).digest("hex"),
    topicReviewLabel: item.topicReviewLabel,
    conceptLabels: Object.fromEntries(Object.entries(item.conceptLabels).sort(([left], [right]) => left.localeCompare(right))),
  }));
  const topicReevaluationVersions = Object.fromEntries(completedReevaluations.map((state) => [state.topicSpecId!, `iteration-${createHash("sha256")
    .update(`${state.observedRevision ?? "unknown"}:${state.completedAt ?? state.requestedAt}`)
    .digest("hex").slice(0, 12)}`]));
  return {
    review,
    input: {
      version: `concept-review-input-${createHash("sha256").update(JSON.stringify({ items: inputPayload, topicReevaluationVersions })).digest("hex").slice(0, 16)}`,
      source: completedReevaluations.length > 0
        ? overrides.length > 0 ? "baseline-with-admin-overrides-and-reevaluation" as const : "baseline-with-reevaluation" as const
        : overrides.length > 0 ? "baseline-with-admin-overrides" as const : "reviewed-baseline" as const,
      baselineReviewedAt: BASELINE.reviewedAt,
      adminOverrideCount: overrides.length,
      latestAdminReviewAt: overrides.map((entry) => entry.updatedAt).sort().at(-1) ?? null,
      completedReevaluationCount: completedReevaluations.length,
      latestReevaluationAt: completedReevaluations.map((state) => state.completedAt ?? state.requestedAt).sort().at(-1) ?? null,
      topicReevaluationVersions,
    },
  };
}

export async function saveConceptReviewEntry(
  id: string,
  input: {
    topicReviewLabel: Exclude<RetrievalReviewLabel, null>;
    conceptLabels: Record<string, ConceptSupportLabel>;
    notes: string;
  },
  updatedBy: string,
) {
  validateConceptLabels(id, input.conceptLabels);
  const saved = await loadSavedData();
  const entry: SavedConceptReviewEntry = { ...input, updatedAt: new Date().toISOString(), updatedBy };
  saved.labels[id] = entry;
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({ key: CACHE_KEY, data: saved, fetched_at: entry.updatedAt });
  if (error) throw error;
  return entry;
}
