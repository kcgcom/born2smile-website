import { getSupabaseAdmin } from "../supabase-admin";
import conceptReviewSeedJson from "./generated/concept-review-seed.json";
import type { ConceptReviewSeed, ConceptSupportLabel } from "./concept-review";
import type { RetrievalReviewLabel } from "./retrieval-evaluation";

const SEED = conceptReviewSeedJson as unknown as ConceptReviewSeed;
const CACHE_KEY = `content-coverage:concept-review:${SEED.retrievalVersion}:${SEED.schemaVersion}`;

interface SavedConceptReviewEntry {
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
  const saved = await loadSavedData();
  const items = SEED.items.map((item) => {
    const entry = saved.labels[item.id];
    return entry ? { ...item, ...entry } : item;
  });
  return { ...SEED, items };
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
