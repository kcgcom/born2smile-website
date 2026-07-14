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
  conceptRetrieval: Record<string, {
    rank: number | null;
    rerankScore: number | null;
    evidenceLevel: "direct" | "supporting" | "discovery-only" | null;
  }>;
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

export interface ConceptReviewBaselineItem {
  id: string;
  topicReviewLabel: Exclude<RetrievalReviewLabel, null>;
  conceptLabels: Record<string, ConceptSupportLabel>;
  notes: string;
}

export interface ConceptReviewBaseline {
  schemaVersion: "concept-review-baseline-v1";
  reviewSchemaVersion: ConceptReviewSeed["schemaVersion"];
  retrievalVersion: ConceptReviewSeed["retrievalVersion"];
  candidateGeneratedAt: string;
  reviewedAt: string;
  items: ConceptReviewBaselineItem[];
}

export const CONCEPT_REVIEW_QUALITY_THRESHOLDS = {
  topicUsablePrecisionAt3: 0.8,
  topicIrrelevantRateAt10: 0.2,
  requiredConceptHitRate: 1,
} as const;

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000;
}

export function applyConceptReviewBaseline(seed: ConceptReviewSeed, baseline: ConceptReviewBaseline): ConceptReviewSeed {
  if (baseline.schemaVersion !== "concept-review-baseline-v1") throw new Error("지원하지 않는 개념 검토 기준선입니다.");
  if (baseline.reviewSchemaVersion !== seed.schemaVersion) throw new Error("개념 검토 스키마가 기준선과 다릅니다.");
  if (baseline.retrievalVersion !== seed.retrievalVersion) throw new Error("개념 검색 버전이 기준선과 다릅니다.");
  if (baseline.candidateGeneratedAt !== seed.generatedAt) throw new Error("개념 검색 후보 스냅샷이 기준선과 다릅니다.");

  const savedById = new Map<string, ConceptReviewBaselineItem>();
  for (const saved of baseline.items) {
    if (savedById.has(saved.id)) throw new Error(`개념 기준선 항목 ID가 중복됩니다: ${saved.id}`);
    if (!["relevant", "partial", "irrelevant"].includes(saved.topicReviewLabel)) throw new Error(`주제 라벨이 올바르지 않습니다: ${saved.id}`);
    if (saved.notes !== saved.notes.trim() || saved.notes.startsWith("사전검토:")) throw new Error(`개념 기준선 메모가 올바르지 않습니다: ${saved.id}`);
    savedById.set(saved.id, saved);
  }
  if (savedById.size !== seed.items.length) throw new Error(`개념 기준선 항목 수가 후보와 다릅니다: ${savedById.size}/${seed.items.length}`);

  return {
    ...seed,
    items: seed.items.map((item) => {
      const saved = savedById.get(item.id);
      if (!saved) throw new Error(`개념 기준선에 후보가 없습니다: ${item.id}`);
      const expectedConceptIds = [...item.conceptIds].sort();
      const savedConceptIds = Object.keys(saved.conceptLabels).sort();
      if (expectedConceptIds.join("|") !== savedConceptIds.join("|")) throw new Error(`개념 기준선 판정 대상이 다릅니다: ${item.id}`);
      if (!Object.values(saved.conceptLabels).every((label) => ["supports", "partial", "not-supported"].includes(label))) {
        throw new Error(`개념 기준선 라벨이 올바르지 않습니다: ${item.id}`);
      }
      return { ...item, ...saved };
    }),
  };
}

export function evaluateConceptReview(specs: CoverageTopicSpec[], review: ConceptReviewSeed) {
  const topics = specs.map((spec) => {
    const items = review.items.filter((item) => item.topicSpecId === spec.id);
    const top3 = items.filter((item) => item.rank <= 3 && item.topicReviewLabel != null);
    const labeled = items.filter((item) => item.topicReviewLabel != null);
    const usableTop3 = top3.filter((item) => item.topicReviewLabel === "relevant" || item.topicReviewLabel === "partial");
    const irrelevant = labeled.filter((item) => item.topicReviewLabel === "irrelevant");
    const concepts = spec.concepts.map((concept) => {
      const reviewedMatches = items.filter((item) => item.conceptIds.includes(concept.id) && item.conceptLabels[concept.id] != null);
      const candidates = reviewedMatches
        .filter((item) => item.conceptRetrieval[concept.id]?.rank != null)
        .sort((left, right) => (left.conceptRetrieval[concept.id].rank ?? 999) - (right.conceptRetrieval[concept.id].rank ?? 999));
      const topConceptCandidates = candidates.slice(0, 3);
      const usable = candidates.filter((item) => item.conceptLabels[concept.id] === "supports" || item.conceptLabels[concept.id] === "partial");
      const strict = candidates.filter((item) => item.conceptLabels[concept.id] === "supports");
      const usableTopConceptCandidates = topConceptCandidates.filter((item) => item.conceptLabels[concept.id] !== "not-supported");
      const strictTopConceptCandidates = topConceptCandidates.filter((item) => item.conceptLabels[concept.id] === "supports");
      return {
        conceptId: concept.id,
        importance: concept.importance,
        reviewedMatches: reviewedMatches.length,
        candidates: candidates.length,
        usableCandidates: usable.length,
        supportsCandidates: strict.length,
        usablePrecisionAt3: ratio(usableTopConceptCandidates.length, topConceptCandidates.length),
        strictPrecisionAt3: ratio(strictTopConceptCandidates.length, topConceptCandidates.length),
        hasUsableEvidence: usable.length > 0,
        hasSupportingEvidence: strict.length > 0,
        hasDirectUsableEvidence: usable.some((item) => item.conceptRetrieval[concept.id].evidenceLevel === "direct"),
      };
    });
    const requiredConcepts = concepts.filter((concept) => concept.importance === "required");
    const conceptJudgments = items.flatMap((item) => item.conceptIds.map((conceptId) => item.conceptLabels[conceptId])).filter((label) => label != null);
    const usableJudgments = conceptJudgments.filter((label) => label === "supports" || label === "partial");
    return {
      topicSpecId: spec.id,
      candidates: items.length,
      labeledCandidates: labeled.length,
      topicUsablePrecisionAt3: ratio(usableTop3.length, top3.length),
      topicIrrelevantRateAt10: ratio(irrelevant.length, labeled.length),
      conceptJudgments: conceptJudgments.length,
      conceptUsableRate: ratio(usableJudgments.length, conceptJudgments.length),
      directEvidenceRate: ratio(
        concepts.reduce((sum, concept) => sum + (concept.hasDirectUsableEvidence ? 1 : 0), 0),
        concepts.filter((concept) => concept.hasUsableEvidence).length,
      ),
      requiredConceptHitRate: ratio(requiredConcepts.filter((concept) => concept.hasUsableEvidence).length, requiredConcepts.length),
      requiredConceptSupportsRate: ratio(requiredConcepts.filter((concept) => concept.hasSupportingEvidence).length, requiredConcepts.length),
      missingRequiredConceptIds: requiredConcepts.filter((concept) => !concept.hasUsableEvidence).map((concept) => concept.conceptId),
      partialOnlyRequiredConceptIds: requiredConcepts.filter((concept) => concept.hasUsableEvidence && !concept.hasSupportingEvidence).map((concept) => concept.conceptId),
      concepts,
    };
  });
  const complete = review.items.length > 0 && review.items.every((item) => item.topicReviewLabel != null
    && item.conceptIds.every((conceptId) => item.conceptLabels[conceptId] != null));
  const passing = complete && topics.every((topic) =>
    (topic.topicUsablePrecisionAt3 ?? 0) >= CONCEPT_REVIEW_QUALITY_THRESHOLDS.topicUsablePrecisionAt3
    && (topic.topicIrrelevantRateAt10 ?? 1) <= CONCEPT_REVIEW_QUALITY_THRESHOLDS.topicIrrelevantRateAt10
    && (topic.requiredConceptHitRate ?? 0) >= CONCEPT_REVIEW_QUALITY_THRESHOLDS.requiredConceptHitRate);
  return {
    verdict: complete ? (passing ? "pass" : "fail") : "incomplete",
    retrievalVersion: review.retrievalVersion,
    thresholds: CONCEPT_REVIEW_QUALITY_THRESHOLDS,
    candidates: review.items.length,
    conceptJudgments: review.items.reduce((sum, item) => sum + item.conceptIds.length, 0),
    topics,
  };
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
      const conceptRetrieval = Object.fromEntries(conceptIds.map((conceptId) => {
        const conceptCandidates = topic.byConcept[conceptId] ?? [];
        const conceptRank = conceptCandidates.findIndex((entry) => entry.evidenceUnitId === candidate.evidenceUnitId);
        const conceptCandidate = conceptRank >= 0 ? conceptCandidates[conceptRank] : null;
        return [conceptId, {
          rank: conceptRank >= 0 ? conceptRank + 1 : null,
          rerankScore: conceptCandidate?.rerankScore ?? null,
          evidenceLevel: conceptCandidate?.evidenceLevel ?? null,
        }];
      }));
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
        conceptRetrieval,
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
