import type { ConceptShadowRetrievalResult } from "./concept-shadow-retrieval";
import type { RetrievalReviewFile, RetrievalReviewLabel } from "./retrieval-evaluation";
import type { CoverageTopicSpec, EvidenceUnit } from "./types";

export const CONCEPT_REVIEW_SCHEMA_VERSION = "concept-review-v1" as const;

export type ConceptSupportLabel = "supports" | "partial" | "not-supported";

export interface ConceptReviewItem {
  id: string;
  topicSpecId: string;
  topicLabel: string;
  rank: number;
  documentId: string;
  evidenceUnitId: string;
  title: string;
  headingPath: string[];
  path: string | null;
  surface: string | null;
  kind: EvidenceUnit["kind"];
  excerpt: string;
  rerankScore: number;
  evidenceLevel: "direct" | "supporting" | "discovery-only";
  conceptIds: string[];
  topicReviewLabel: RetrievalReviewLabel;
  conceptLabels: Record<string, ConceptSupportLabel | null>;
  notes: string;
}

export interface ConceptReviewSeed {
  schemaVersion: typeof CONCEPT_REVIEW_SCHEMA_VERSION;
  retrievalVersion: ConceptShadowRetrievalResult["version"];
  generatedAt: string;
  items: ConceptReviewItem[];
}

export function buildConceptReviewSeed(
  specs: CoverageTopicSpec[],
  shadow: ConceptShadowRetrievalResult,
  baseline: RetrievalReviewFile,
): ConceptReviewSeed {
  const baselineLabels = new Map(baseline.items.map((item) => [`${item.topicSpecId}:${item.evidenceUnitId}`, item.label]));
  const items = specs.flatMap((spec) => {
    const topic = shadow.topics[spec.id];
    if (!topic) throw new Error(`개념 검색 결과가 없습니다: ${spec.id}`);
    const conceptOrder = new Map(spec.concepts.map((concept, index) => [concept.id, index]));
    return topic.integrated.map((candidate, index) => {
      const conceptIds = [...candidate.matchedConceptIds].sort((a, b) => (conceptOrder.get(a) ?? 999) - (conceptOrder.get(b) ?? 999));
      return {
        id: `${shadow.version}:${spec.id}:${candidate.evidenceUnitId}`,
        topicSpecId: spec.id,
        topicLabel: spec.label,
        rank: index + 1,
        documentId: candidate.documentId,
        evidenceUnitId: candidate.evidenceUnitId,
        title: candidate.title,
        headingPath: candidate.headingPath,
        path: candidate.path,
        surface: candidate.surface,
        kind: candidate.kind,
        excerpt: candidate.excerpt,
        rerankScore: candidate.rerankScore,
        evidenceLevel: candidate.evidenceLevel,
        conceptIds,
        topicReviewLabel: baselineLabels.get(`${spec.id}:${candidate.evidenceUnitId}`) ?? null,
        conceptLabels: Object.fromEntries(conceptIds.map((conceptId) => [conceptId, null])),
        notes: "",
      } satisfies ConceptReviewItem;
    });
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error("개념 검토 후보 ID가 중복됩니다.");
  return {
    schemaVersion: CONCEPT_REVIEW_SCHEMA_VERSION,
    retrievalVersion: shadow.version,
    generatedAt: shadow.generatedAt,
    items,
  };
}
