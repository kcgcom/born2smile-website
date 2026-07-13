import { getActiveKeywordTaxonomy } from "./admin-keyword-taxonomy";
import { getActiveSearchAdSnapshotRecord } from "./admin-searchad-snapshots";
import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import {
  buildKeywordEvaluationPool,
  buildKeywordEvaluationSample,
  type ActionPreReview,
  type HumanEvaluationLabel,
  type KeywordEvaluationItem,
  type PlacementPreReview,
  type PurposePreReview,
  type RelevancePreReview,
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
  relevancePreReviews: Record<string, RelevancePreReview>;
  purposePreReviews: Record<string, PurposePreReview>;
  actionPreReviews: Record<string, ActionPreReview>;
  placementPreReviews: Record<string, PlacementPreReview>;
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
    relevancePreReviews: saved.relevancePreReviews && typeof saved.relevancePreReviews === "object" ? saved.relevancePreReviews : {},
    purposePreReviews: saved.purposePreReviews && typeof saved.purposePreReviews === "object" ? saved.purposePreReviews : {},
    actionPreReviews: saved.actionPreReviews && typeof saved.actionPreReviews === "object" ? saved.actionPreReviews : {},
    placementPreReviews: saved.placementPreReviews && typeof saved.placementPreReviews === "object" ? saved.placementPreReviews : {},
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
    relevancePreReviews: {},
    purposePreReviews: {},
    actionPreReviews: {},
    placementPreReviews: {},
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
    items: saved.items.map((item) => ({
      ...item,
      humanLabel: saved.labels[item.id] ?? null,
      relevancePreReview: saved.relevancePreReviews[item.id] ?? null,
      purposePreReview: saved.purposePreReviews[item.id] ?? null,
      actionPreReview: saved.actionPreReviews[item.id] ?? null,
      placementPreReview: saved.placementPreReviews[item.id] ?? null,
    })),
    taxonomy: saved.taxonomy,
  };
}

export async function saveKeywordCandidateRelevancePreReviews(
  reviews: Array<{ id: string; relevance: RelevancePreReview["relevance"] }>,
  reviewedBy: string,
) {
  const saved = await ensureEvaluationData();
  const validIds = new Set(saved.items.map((item) => item.id));
  if (reviews.length !== saved.items.length || reviews.some((review) => !validIds.has(review.id))) {
    throw new Error("EVALUATION_REVIEW_SET_MISMATCH");
  }
  const reviewedAt = new Date().toISOString();
  saved.relevancePreReviews = Object.fromEntries(reviews.map((review) => [review.id, {
    relevance: review.relevance,
    reviewedAt,
    reviewedBy,
  }]));
  await persist(saved, reviewedAt);
  return { reviewed: reviews.length, reviewedAt };
}

export async function saveKeywordCandidatePurposePreReviews(
  reviews: Array<{ id: string; purpose: PurposePreReview["purpose"] }>,
  reviewedBy: string,
) {
  const saved = await ensureEvaluationData();
  const validIds = new Set(saved.items.map((item) => item.id));
  if (reviews.length !== saved.items.length || reviews.some((review) => !validIds.has(review.id))) {
    throw new Error("EVALUATION_REVIEW_SET_MISMATCH");
  }
  const reviewedAt = new Date().toISOString();
  saved.purposePreReviews = Object.fromEntries(reviews.map((review) => [review.id, {
    purpose: review.purpose,
    reviewedAt,
    reviewedBy,
  }]));
  await persist(saved, reviewedAt);
  return { reviewed: reviews.length, reviewedAt };
}

export async function saveKeywordCandidateActionPreReviews(
  reviews: Array<{ id: string; action: ActionPreReview["action"] }>,
  reviewedBy: string,
) {
  const saved = await ensureEvaluationData();
  const validIds = new Set(saved.items.map((item) => item.id));
  if (reviews.length !== saved.items.length || reviews.some((review) => !validIds.has(review.id))) {
    throw new Error("EVALUATION_REVIEW_SET_MISMATCH");
  }
  const reviewedAt = new Date().toISOString();
  saved.actionPreReviews = Object.fromEntries(reviews.map((review) => [review.id, {
    action: review.action,
    reviewedAt,
    reviewedBy,
  }]));
  await persist(saved, reviewedAt);
  return { reviewed: reviews.length, reviewedAt };
}

export async function saveKeywordCandidatePlacementPreReviews(
  reviews: Array<{ id: string; category: PlacementPreReview["category"]; subgroup: string }>,
  reviewedBy: string,
) {
  const saved = await ensureEvaluationData();
  const itemsById = new Map(saved.items.map((item) => [item.id, item]));
  const taxonomy = new Map(saved.taxonomy.map((category) => [category.slug, new Set(category.subgroups)]));
  if (reviews.some((review) => !itemsById.has(review.id) || !taxonomy.get(review.category)?.has(review.subgroup))) {
    throw new Error("EVALUATION_PLACEMENT_MISMATCH");
  }
  const reviewedAt = new Date().toISOString();
  saved.placementPreReviews = {
    ...saved.placementPreReviews,
    ...Object.fromEntries(reviews.map((review) => [review.id, {
      category: review.category,
      subgroup: review.subgroup,
      reviewedAt,
      reviewedBy,
    }])),
  };
  await persist(saved, reviewedAt);
  return { reviewed: reviews.length, reviewedAt };
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

export async function confirmKeywordCandidatePreReviews(updatedBy: string) {
  const saved = await ensureEvaluationData();
  const confirmedAt = new Date().toISOString();
  let confirmed = 0;
  let preserved = 0;

  for (const item of saved.items) {
    if (saved.labels[item.id]) {
      preserved += 1;
      continue;
    }
    const relevance = saved.relevancePreReviews[item.id]?.relevance;
    const purpose = saved.purposePreReviews[item.id]?.purpose;
    const action = saved.actionPreReviews[item.id]?.action;
    if (!relevance || !purpose || !action || action === "review" || action === "reclassify" || purpose === "unknown") {
      throw new Error("EVALUATION_PRE_REVIEW_INCOMPLETE");
    }
    const placement = saved.placementPreReviews[item.id];
    const category = purpose === "taxonomy" ? placement?.category ?? item.lexicalCategory : null;
    const subgroup = purpose === "taxonomy" ? placement?.subgroup ?? item.lexicalSubgroup : null;
    if (purpose === "taxonomy" && (!category || !subgroup)) throw new Error("EVALUATION_PLACEMENT_INCOMPLETE");
    saved.labels[item.id] = {
      relevance,
      purpose,
      action,
      category,
      subgroup,
      notes: "",
      updatedAt: confirmedAt,
      updatedBy,
    };
    confirmed += 1;
  }

  await persist(saved, confirmedAt);
  return { confirmed, preserved, total: saved.items.length, confirmedAt };
}
