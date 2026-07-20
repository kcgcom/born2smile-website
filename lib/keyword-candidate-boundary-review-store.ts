import type { HumanEvaluationLabel } from "./keyword-candidate-evaluation";
import type { KeywordShadowAuditTaxonomyOption } from "./keyword-candidate-shadow-audit-store";
import type { KeywordShadowPrediction, ShadowTaxonomyCandidate } from "./keyword-candidate-shadow";
import { getSupabaseAdmin } from "./supabase-admin";

const SCHEMA_VERSION = 1;
const CACHE_KEY = `keyword-candidate:boundary-review:${SCHEMA_VERSION}:active`;

export interface KeywordBoundaryReviewItem {
  id: string;
  keyword: string;
  monthlyVolume: number;
  reasons: string[];
  predictedRelevance: KeywordShadowPrediction["relevance"];
  predictedPurpose: KeywordShadowPrediction["purpose"];
  predictedAction: KeywordShadowPrediction["action"];
  relevanceConfidence: number;
  purposeConfidence: number;
  taxonomyCandidates: ShadowTaxonomyCandidate[];
  preReview: KeywordBoundaryReviewPreReview | null;
  humanLabel: HumanEvaluationLabel | null;
}

export interface KeywordBoundaryReviewPreReview extends Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy"> {
  reviewedAt: string;
  reviewedBy: string;
}

interface SavedKeywordBoundaryReviewData {
  schemaVersion: number;
  engineVersion: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordBoundaryReviewItem, "preReview" | "humanLabel">[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
  preReviews: Record<string, KeywordBoundaryReviewPreReview>;
  labels: Record<string, HumanEvaluationLabel>;
}

export interface PublishKeywordBoundaryReviewInput {
  engineVersion: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordBoundaryReviewItem, "preReview" | "humanLabel">[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
}

async function loadSavedBoundaryReview(): Promise<SavedKeywordBoundaryReviewData | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .eq("key", CACHE_KEY)
    .maybeSingle();
  if (error) throw error;
  const saved = data?.data as Partial<SavedKeywordBoundaryReviewData> | null;
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

async function persistBoundaryReview(data: SavedKeywordBoundaryReviewData, fetchedAt: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("api_cache").upsert({
    key: CACHE_KEY,
    data,
    fetched_at: fetchedAt,
  });
  if (error) throw error;
}

export async function publishKeywordCandidateBoundaryReview(input: PublishKeywordBoundaryReviewInput) {
  if (input.items.length === 0 || input.items.length > 30) throw new Error("BOUNDARY_REVIEW_SIZE_INVALID");
  const previous = await loadSavedBoundaryReview();
  const validIds = new Set(input.items.map((item) => item.id));
  const preserveLabels = previous?.snapshotId === input.snapshotId && previous.engineVersion === input.engineVersion;
  const preReviews = preserveLabels
    ? Object.fromEntries(Object.entries(previous.preReviews).filter(([id]) => validIds.has(id)))
    : {};
  const labels = preserveLabels
    ? Object.fromEntries(Object.entries(previous.labels).filter(([id]) => validIds.has(id)))
    : {};
  const saved: SavedKeywordBoundaryReviewData = {
    schemaVersion: SCHEMA_VERSION,
    ...input,
    preReviews,
    labels,
  };
  await persistBoundaryReview(saved, input.generatedAt);
  return { published: input.items.length, preservedLabels: Object.keys(labels).length };
}

export async function getKeywordCandidateBoundaryReviewData() {
  const saved = await loadSavedBoundaryReview();
  if (!saved) throw new Error("BOUNDARY_REVIEW_NOT_FOUND");
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

export async function saveKeywordCandidateBoundaryReviewPreReviews(
  reviews: Array<{ id: string; label: Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy"> }>,
  reviewedBy: string,
) {
  const saved = await loadSavedBoundaryReview();
  if (!saved) throw new Error("BOUNDARY_REVIEW_NOT_FOUND");
  const validIds = new Set(saved.items.map((item) => item.id));
  if (reviews.some((review) => !validIds.has(review.id))) throw new Error("BOUNDARY_REVIEW_ITEM_NOT_FOUND");
  const reviewedAt = new Date().toISOString();
  saved.preReviews = {
    ...saved.preReviews,
    ...Object.fromEntries(reviews.map((review) => [review.id, {
      ...review.label,
      reviewedAt,
      reviewedBy,
    }])),
  };
  await persistBoundaryReview(saved, reviewedAt);
  return { reviewed: reviews.length, preservedLabels: reviews.filter((review) => saved.labels[review.id]).length, reviewedAt };
}

export async function saveKeywordCandidateBoundaryReviewEvaluation(
  id: string,
  input: Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy">,
  updatedBy: string,
) {
  const saved = await loadSavedBoundaryReview();
  if (!saved) throw new Error("BOUNDARY_REVIEW_NOT_FOUND");
  if (!saved.items.some((item) => item.id === id)) throw new Error("BOUNDARY_REVIEW_ITEM_NOT_FOUND");
  if (input.category && !saved.taxonomy.some((category) =>
    category.slug === input.category && input.subgroup && category.subgroups.includes(input.subgroup),
  )) throw new Error("BOUNDARY_REVIEW_PLACEMENT_INVALID");
  const entry: HumanEvaluationLabel = {
    ...input,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saved.labels[id] = entry;
  await persistBoundaryReview(saved, entry.updatedAt);
  return entry;
}
