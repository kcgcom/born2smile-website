import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import type { HumanEvaluationLabel } from "./keyword-candidate-evaluation";
import type { ShadowTaxonomyCandidate } from "./keyword-candidate-shadow";
import { getSupabaseAdmin } from "./supabase-admin";

const SCHEMA_VERSION = 1;
const CACHE_KEY = `keyword-candidate:shadow-audit:${SCHEMA_VERSION}:active`;

export type KeywordShadowAuditDatasetRole = "training" | "holdout";

export interface KeywordShadowAuditTaxonomyOption {
  slug: KeywordCategorySlug;
  label: string;
  subgroups: string[];
}

export interface KeywordShadowAuditItem {
  id: string;
  keyword: string;
  monthlyVolume: number;
  purposeRank: number;
  predictedRelevance: "relevant";
  predictedPurpose: Exclude<HumanEvaluationLabel["purpose"], "noise" | "unknown">;
  predictedAction: HumanEvaluationLabel["action"];
  relevanceConfidence: number;
  purposeConfidence: number;
  taxonomyCandidates: ShadowTaxonomyCandidate[];
  preReview: KeywordShadowAuditPreReview | null;
  humanLabel: HumanEvaluationLabel | null;
}

export interface KeywordShadowAuditPreReview extends Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy"> {
  reviewedAt: string;
  reviewedBy: string;
}

interface SavedKeywordShadowAuditData {
  schemaVersion: number;
  engineVersion: string;
  datasetRole: KeywordShadowAuditDatasetRole;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordShadowAuditItem, "preReview" | "humanLabel">[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
  preReviews: Record<string, KeywordShadowAuditPreReview>;
  labels: Record<string, HumanEvaluationLabel>;
}

export interface PublishKeywordShadowAuditInput {
  engineVersion: string;
  datasetRole: KeywordShadowAuditDatasetRole;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordShadowAuditItem, "preReview" | "humanLabel">[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
}

async function loadSavedAudit(): Promise<SavedKeywordShadowAuditData | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .eq("key", CACHE_KEY)
    .maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedKeywordShadowAuditData> | null;
  if (!saved || saved.schemaVersion !== SCHEMA_VERSION || !Array.isArray(saved.items) || !Array.isArray(saved.taxonomy)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: saved.engineVersion ?? "unknown",
    datasetRole: saved.datasetRole === "holdout" || saved.engineVersion === "keyword-shadow-v5"
      ? "holdout"
      : "training",
    snapshotId: saved.snapshotId ?? "unknown",
    snapshotCreatedAt: saved.snapshotCreatedAt ?? new Date(0).toISOString(),
    taxonomyVersion: saved.taxonomyVersion ?? null,
    generatedAt: saved.generatedAt ?? new Date(0).toISOString(),
    items: saved.items,
    taxonomy: saved.taxonomy,
    preReviews: saved.preReviews && typeof saved.preReviews === "object" ? saved.preReviews : {},
    labels: saved.labels && typeof saved.labels === "object" ? saved.labels : {},
  };
}

async function persistAudit(data: SavedKeywordShadowAuditData, fetchedAt: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: CACHE_KEY,
    data,
    fetched_at: fetchedAt,
  });
  if (error) throw error;
}

async function archiveAudit(data: SavedKeywordShadowAuditData): Promise<void> {
  const key = `keyword-candidate:shadow-audit:history:${data.snapshotId}:${data.engineVersion}`;
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key,
    data,
    fetched_at: data.generatedAt,
  });
  if (error) throw error;
}

export async function publishKeywordCandidateShadowAudit(input: PublishKeywordShadowAuditInput) {
  if (input.items.length === 0 || input.items.length > 100) throw new Error("SHADOW_AUDIT_SIZE_INVALID");
  const previous = await loadSavedAudit();
  const validIds = new Set(input.items.map((item) => item.id));
  const preserveLabels = previous?.snapshotId === input.snapshotId && previous.engineVersion === input.engineVersion;
  const preReviews = preserveLabels
    ? Object.fromEntries(Object.entries(previous.preReviews).filter(([id]) => validIds.has(id)))
    : {};
  const labels = preserveLabels
    ? Object.fromEntries(Object.entries(previous.labels).filter(([id]) => validIds.has(id)))
    : {};
  const saved: SavedKeywordShadowAuditData = {
    schemaVersion: SCHEMA_VERSION,
    ...input,
    preReviews,
    labels,
  };
  if (previous && (previous.snapshotId !== input.snapshotId || previous.engineVersion !== input.engineVersion)) {
    await archiveAudit(previous);
  }
  await persistAudit(saved, input.generatedAt);
  return { published: input.items.length, preservedLabels: Object.keys(labels).length };
}

export async function getKeywordCandidateShadowAuditData() {
  const saved = await loadSavedAudit();
  if (!saved) throw new Error("SHADOW_AUDIT_NOT_FOUND");
  return {
    schemaVersion: saved.schemaVersion,
    engineVersion: saved.engineVersion,
    datasetRole: saved.datasetRole,
    snapshotId: saved.snapshotId,
    snapshotCreatedAt: saved.snapshotCreatedAt,
    taxonomyVersion: saved.taxonomyVersion,
    generatedAt: saved.generatedAt,
    items: saved.items.map((item) => ({
      ...item,
      preReview: saved.preReviews[item.id] ?? null,
      humanLabel: saved.labels[item.id] ?? null,
    })),
    taxonomy: saved.taxonomy,
  };
}

export async function getKeywordCandidateShadowAuditReferences(
  snapshotId: string,
  options: { includeHoldout?: boolean } = {},
) {
  const active = await loadSavedAudit();
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .like("key", "keyword-candidate:shadow-audit:history:%");
  if (error) throw error;
  const history = (data ?? []).flatMap((row) => {
    const saved = row.data as Partial<SavedKeywordShadowAuditData> | null;
    return saved && saved.schemaVersion === SCHEMA_VERSION && Array.isArray(saved.items) && saved.labels
      ? [{
          snapshotId: saved.snapshotId ?? "unknown",
          engineVersion: saved.engineVersion ?? "unknown",
          datasetRole: saved.datasetRole === "holdout" || saved.engineVersion === "keyword-shadow-v5"
            ? "holdout" as const
            : "training" as const,
          items: saved.items,
          labels: saved.labels,
        }]
      : [];
  });
  const datasets = [
    ...(active ? [{
      snapshotId: active.snapshotId,
      engineVersion: active.engineVersion,
      datasetRole: active.datasetRole,
      items: active.items,
      labels: active.labels,
    }] : []),
    ...history,
  ].filter((dataset) =>
    dataset.snapshotId === snapshotId
    && (options.includeHoldout || dataset.datasetRole === "training"),
  );
  const references = new Map<string, { id: string; keyword: string; label: HumanEvaluationLabel }>();
  for (const dataset of datasets) {
    for (const item of dataset.items) {
      const label = dataset.labels[item.id];
      if (!label) continue;
      const key = item.keyword.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
      if (!references.has(key)) references.set(key, {
        id: `audit:${dataset.engineVersion}:${item.id}`,
        keyword: item.keyword,
        label,
      });
    }
  }
  return [...references.values()];
}
