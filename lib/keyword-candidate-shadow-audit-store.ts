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
  humanLabel: HumanEvaluationLabel | null;
}

interface SavedKeywordShadowAuditData {
  schemaVersion: number;
  engineVersion: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordShadowAuditItem, "humanLabel">[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
  labels: Record<string, HumanEvaluationLabel>;
}

export interface PublishKeywordShadowAuditInput {
  engineVersion: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: Omit<KeywordShadowAuditItem, "humanLabel">[];
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

export async function publishKeywordCandidateShadowAudit(input: PublishKeywordShadowAuditInput) {
  if (input.items.length === 0 || input.items.length > 100) throw new Error("SHADOW_AUDIT_SIZE_INVALID");
  const previous = await loadSavedAudit();
  const validIds = new Set(input.items.map((item) => item.id));
  const preserveLabels = previous?.snapshotId === input.snapshotId && previous.engineVersion === input.engineVersion;
  const labels = preserveLabels
    ? Object.fromEntries(Object.entries(previous.labels).filter(([id]) => validIds.has(id)))
    : {};
  const saved: SavedKeywordShadowAuditData = {
    schemaVersion: SCHEMA_VERSION,
    ...input,
    labels,
  };
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
    items: saved.items.map((item) => ({ ...item, humanLabel: saved.labels[item.id] ?? null })),
    taxonomy: saved.taxonomy,
  };
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
