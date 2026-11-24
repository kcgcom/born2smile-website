import type { HumanEvaluationLabel } from "./keyword-candidate-evaluation";
import type { ShadowReference } from "./keyword-candidate-shadow";
import { getSupabaseAdmin } from "./supabase-admin";

const SCHEMA_VERSION = 1;
const CACHE_KEY = `keyword-candidate:boundary-review:${SCHEMA_VERSION}:active`;

interface SavedKeywordBoundaryReviewData {
  schemaVersion: number;
  engineVersion: string;
  snapshotId: string;
  items: { id: string; keyword: string }[];
  taxonomy: unknown[];
  labels: Record<string, HumanEvaluationLabel>;
}

async function loadSavedBoundaryReview() {
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .eq("key", CACHE_KEY)
    .maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedKeywordBoundaryReviewData> | null;
  if (!saved || saved.schemaVersion !== SCHEMA_VERSION || !Array.isArray(saved.items) || !Array.isArray(saved.taxonomy)) return null;
  return {
    engineVersion: saved.engineVersion ?? "unknown",
    snapshotId: saved.snapshotId ?? "unknown",
    items: saved.items,
    labels: saved.labels && typeof saved.labels === "object" ? saved.labels : {},
  };
}

export async function getKeywordCandidateBoundaryReviewReferences(snapshotId: string): Promise<ShadowReference[]> {
  const active = await loadSavedBoundaryReview();
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .like("key", "keyword-candidate:boundary-review:history:%");
  if (error) throw error;
  const history = (data ?? []).flatMap((row) => {
    const saved = row.data as Partial<SavedKeywordBoundaryReviewData> | null;
    return saved && saved.schemaVersion === SCHEMA_VERSION && Array.isArray(saved.items) && saved.labels
      ? [{
          snapshotId: saved.snapshotId ?? "unknown",
          engineVersion: saved.engineVersion ?? "unknown",
          items: saved.items,
          labels: saved.labels,
        }]
      : [];
  });
  const datasets = [
    ...(active ? [{
      snapshotId: active.snapshotId,
      engineVersion: active.engineVersion,
      items: active.items,
      labels: active.labels,
    }] : []),
    ...history,
  ].filter((dataset) => dataset.snapshotId === snapshotId);
  const references = new Map<string, ShadowReference>();
  for (const dataset of datasets) {
    for (const item of dataset.items) {
      const label = dataset.labels[item.id];
      if (!label) continue;
      const key = item.keyword.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
      if (!references.has(key)) references.set(key, {
        id: `boundary:${dataset.engineVersion}:${item.id}`,
        keyword: item.keyword,
        label,
      });
    }
  }
  return [...references.values()];
}
