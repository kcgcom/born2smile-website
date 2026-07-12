import { getSupabaseAdmin } from "../supabase-admin";
import { RETRIEVAL_REVIEW_SEED } from "./generated/retrieval-review-seed";
import type { RetrievalReasonTag, RetrievalReviewLabel } from "./retrieval-evaluation";

const CACHE_KEY = `content-coverage:retrieval-review:${RETRIEVAL_REVIEW_SEED.model}:${RETRIEVAL_REVIEW_SEED.schemaVersion}`;

interface SavedReviewEntry {
  label: Exclude<RetrievalReviewLabel, null>;
  reasonTags: RetrievalReasonTag[];
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

interface SavedReviewData {
  labels: Record<string, SavedReviewEntry>;
}

async function loadSavedData(): Promise<SavedReviewData> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", CACHE_KEY).maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedReviewData> | null;
  return { labels: saved?.labels && typeof saved.labels === "object" ? saved.labels : {} };
}

export async function getRetrievalReviewData() {
  const saved = await loadSavedData();
  const items = RETRIEVAL_REVIEW_SEED.items.map((item) => {
    const entry = saved.labels[item.id];
    return entry ? { ...item, label: entry.label, reasonTags: entry.reasonTags, notes: entry.notes, updatedAt: entry.updatedAt, updatedBy: entry.updatedBy } : item;
  });
  return { ...RETRIEVAL_REVIEW_SEED, items };
}

export async function saveRetrievalReviewEntry(
  id: string,
  input: { label: Exclude<RetrievalReviewLabel, null>; reasonTags: RetrievalReasonTag[]; notes: string },
  updatedBy: string,
) {
  if (!RETRIEVAL_REVIEW_SEED.items.some((item) => item.id === id)) throw new Error("REVIEW_ITEM_NOT_FOUND");
  const saved = await loadSavedData();
  const entry: SavedReviewEntry = { ...input, updatedAt: new Date().toISOString(), updatedBy };
  saved.labels[id] = entry;
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({ key: CACHE_KEY, data: saved, fetched_at: entry.updatedAt });
  if (error) throw error;
  return entry;
}
