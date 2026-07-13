import { getActiveKeywordTaxonomy } from "./admin-keyword-taxonomy";
import { getActiveSearchAdSnapshotRecord } from "./admin-searchad-snapshots";
import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import {
  buildKeywordEvaluationPool,
  buildKeywordEvaluationSample,
  type HumanEvaluationLabel,
  type KeywordEvaluationItem,
} from "./keyword-candidate-evaluation";
import { getSupabaseAdmin } from "./supabase-admin";

const SCHEMA_VERSION = 1;
const CACHE_KEY = `keyword-candidate:evaluation:${SCHEMA_VERSION}:active`;

interface EvaluationTaxonomyOption {
  slug: KeywordCategorySlug;
  label: string;
  subgroups: string[];
}

interface SavedEvaluationData {
  schemaVersion: number;
  taxonomyVersion: number | null;
  snapshotId: string;
  snapshotCreatedAt: string;
  items: KeywordEvaluationItem[];
  taxonomy: EvaluationTaxonomyOption[];
  labels: Record<string, HumanEvaluationLabel>;
}

async function loadSavedData(): Promise<SavedEvaluationData | null> {
  const { data, error } = await getSupabaseAdmin().from("api_cache").select("data").eq("key", CACHE_KEY).maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedEvaluationData> | null;
  if (!saved || saved.schemaVersion !== SCHEMA_VERSION || !Array.isArray(saved.items) || saved.items.length === 0) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    taxonomyVersion: saved.taxonomyVersion ?? null,
    snapshotId: saved.snapshotId ?? "unknown",
    snapshotCreatedAt: saved.snapshotCreatedAt ?? new Date(0).toISOString(),
    items: saved.items,
    taxonomy: Array.isArray(saved.taxonomy) ? saved.taxonomy : [],
    labels: saved.labels && typeof saved.labels === "object" ? saved.labels : {},
  };
}

async function persist(data: SavedEvaluationData, fetchedAt: string) {
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: CACHE_KEY,
    data,
    fetched_at: fetchedAt,
  });
  if (error) throw error;
}

async function ensureEvaluationData(): Promise<SavedEvaluationData> {
  const saved = await loadSavedData();
  if (saved) return saved;

  const [{ taxonomy, version }, snapshot] = await Promise.all([
    getActiveKeywordTaxonomy(),
    getActiveSearchAdSnapshotRecord(),
  ]);
  if (!snapshot) throw new Error("ACTIVE_SEARCHAD_SNAPSHOT_NOT_FOUND");
  const created: SavedEvaluationData = {
    schemaVersion: SCHEMA_VERSION,
    taxonomyVersion: version,
    snapshotId: snapshot.id,
    snapshotCreatedAt: snapshot.createdAt,
    items: buildKeywordEvaluationSample(buildKeywordEvaluationPool(taxonomy, snapshot.data)),
    taxonomy: taxonomy.map((category) => ({
      slug: category.slug,
      label: category.category,
      subgroups: category.subGroups.map((group) => group.name),
    })),
    labels: {},
  };
  await persist(created, new Date().toISOString());
  return created;
}

export async function getKeywordCandidateEvaluationData() {
  const saved = await ensureEvaluationData();
  return {
    schemaVersion: saved.schemaVersion,
    taxonomyVersion: saved.taxonomyVersion,
    snapshotId: saved.snapshotId,
    snapshotCreatedAt: saved.snapshotCreatedAt,
    items: saved.items.map((item) => ({ ...item, humanLabel: saved.labels[item.id] ?? null })),
    taxonomy: saved.taxonomy,
  };
}

export async function saveKeywordCandidateEvaluation(
  id: string,
  input: Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy">,
  updatedBy: string,
) {
  const saved = await ensureEvaluationData();
  if (!saved.items.some((item) => item.id === id)) throw new Error("EVALUATION_ITEM_NOT_FOUND");
  const entry: HumanEvaluationLabel = {
    ...input,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saved.labels[id] = entry;
  await persist(saved, entry.updatedAt);
  return entry;
}
