import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import type { HumanEvaluationLabel } from "./keyword-candidate-evaluation";
import type { ShadowTaxonomyCandidate } from "./keyword-candidate-shadow";
import { getSupabaseAdmin } from "./supabase-admin";

const SCHEMA_VERSION = 1;
const CACHE_KEY = `keyword-candidate:shadow-audit:${SCHEMA_VERSION}:active`;

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

export async function getKeywordCandidateShadowAuditReferences(snapshotId: string) {
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
          items: saved.items,
          labels: saved.labels,
        }]
      : [];
  });
  const datasets = [
    ...(active ? [{ snapshotId: active.snapshotId, engineVersion: active.engineVersion, items: active.items, labels: active.labels }] : []),
    ...history,
  ].filter((dataset) => dataset.snapshotId === snapshotId);
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

export async function saveKeywordCandidateShadowAuditPreReviews(
  reviews: Array<{ id: string; label: Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy"> }>,
  reviewedBy: string,
) {
  const saved = await loadSavedAudit();
  if (!saved) throw new Error("SHADOW_AUDIT_NOT_FOUND");
  const validIds = new Set(saved.items.map((item) => item.id));
  if (reviews.some((review) => !validIds.has(review.id))) throw new Error("SHADOW_AUDIT_ITEM_NOT_FOUND");
  const reviewedAt = new Date().toISOString();
  saved.preReviews = {
    ...saved.preReviews,
    ...Object.fromEntries(reviews.map((review) => [review.id, {
      ...review.label,
      reviewedAt,
      reviewedBy,
    }])),
  };
  await persistAudit(saved, reviewedAt);
  return { reviewed: reviews.length, preservedLabels: reviews.filter((review) => saved.labels[review.id]).length, reviewedAt };
}

export async function confirmKeywordCandidateShadowAuditPreReviews(updatedBy: string) {
  const saved = await loadSavedAudit();
  if (!saved) throw new Error("SHADOW_AUDIT_NOT_FOUND");
  const confirmedAt = new Date().toISOString();
  let confirmed = 0;
  let preserved = 0;
  for (const item of saved.items) {
    if (saved.labels[item.id]) {
      preserved += 1;
      continue;
    }
    const preReview = saved.preReviews[item.id];
    if (!preReview) throw new Error("SHADOW_AUDIT_PRE_REVIEW_INCOMPLETE");
    saved.labels[item.id] = {
      relevance: preReview.relevance,
      purpose: preReview.purpose,
      action: preReview.action,
      category: preReview.category,
      subgroup: preReview.subgroup,
      notes: preReview.notes,
      updatedAt: confirmedAt,
      updatedBy,
    };
    confirmed += 1;
  }
  await persistAudit(saved, confirmedAt);
  return { confirmed, preserved, total: saved.items.length, confirmedAt };
}

export async function saveKeywordCandidateShadowAuditEvaluation(
  id: string,
  input: Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy">,
  updatedBy: string,
) {
  const saved = await loadSavedAudit();
  if (!saved) throw new Error("SHADOW_AUDIT_NOT_FOUND");
  if (!saved.items.some((item) => item.id === id)) throw new Error("SHADOW_AUDIT_ITEM_NOT_FOUND");
  if (input.category && !saved.taxonomy.some((category) =>
    category.slug === input.category && input.subgroup && category.subgroups.includes(input.subgroup),
  )) throw new Error("SHADOW_AUDIT_PLACEMENT_INVALID");
  const entry: HumanEvaluationLabel = {
    ...input,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saved.labels[id] = entry;
  await persistAudit(saved, entry.updatedAt);
  return entry;
}
