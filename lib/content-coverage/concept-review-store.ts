import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "../supabase-admin";
import conceptReviewBaselineJson from "./generated/concept-review-baseline.json";
import conceptReviewSeedJson from "./generated/concept-review-seed.json";
import { applyConceptReviewBaseline, type ConceptReviewBaseline, type ConceptReviewSeed, type ConceptSupportLabel } from "./concept-review";
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
  const saved = await loadSavedData();
  return buildOperationalConceptReviewSnapshot(saved.labels);
}

export function buildOperationalConceptReviewSnapshot(savedLabels: Record<string, SavedConceptReviewEntry>) {
  const items = BASE_REVIEW.items.map((item) => {
    const entry = savedLabels[item.id];
    return entry ? { ...item, ...entry } : item;
  });
  const review = { ...BASE_REVIEW, items };
  const overrides = BASE_REVIEW.items.flatMap((item) => savedLabels[item.id] ? [savedLabels[item.id]] : []);
  const inputPayload = items.map((item) => ({
    id: item.id,
    topicReviewLabel: item.topicReviewLabel,
    conceptLabels: Object.fromEntries(Object.entries(item.conceptLabels).sort(([left], [right]) => left.localeCompare(right))),
  }));
  return {
    review,
    input: {
      version: `concept-review-input-${createHash("sha256").update(JSON.stringify(inputPayload)).digest("hex").slice(0, 16)}`,
      source: overrides.length > 0 ? "baseline-with-admin-overrides" as const : "reviewed-baseline" as const,
      baselineReviewedAt: BASELINE.reviewedAt,
      adminOverrideCount: overrides.length,
      latestAdminReviewAt: overrides.map((entry) => entry.updatedAt).sort().at(-1) ?? null,
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
