import type { ConceptReviewSeed, ConceptSupportLabel } from "./concept-review";
import type { AssessmentConfidence, ConceptCoverageStatus, CoverageTopicSpec, CriterionCoverageResult } from "./types";

export const CONCEPT_SATISFACTION_VERSION = "concept-satisfaction-v1" as const;

export type ProvisionalConceptStatus = "covered" | "partial" | "missing" | "not-evaluated";
export type ConceptSearchResolutionType = "no-explicit-evidence" | "search-insufficient";

export interface ConceptSearchResolutionItem {
  topicSpecId: string;
  conceptId: string;
  resolution: ConceptSearchResolutionType;
  notes: string;
}

export interface ConceptSearchResolution {
  schemaVersion: "concept-search-resolution-v1";
  retrievalVersion: string;
  reviewedAt: string;
  items: ConceptSearchResolutionItem[];
}

export interface ConceptSatisfactionResult {
  topicSpecId: string;
  conceptId: string;
  status: ConceptCoverageStatus;
  provisionalStatus: ProvisionalConceptStatus;
  coverageScore: null;
  evidence: {
    supportingEvidenceIds: string[];
    partialEvidenceIds: string[];
    rejectedEvidenceIds: string[];
  };
  retrievalDisposition: "reviewed-evidence" | "confirmed-no-explicit-evidence" | "search-insufficient";
  criteria: CriterionCoverageResult[];
  confidence: AssessmentConfidence;
  requiresClinicalReview: boolean;
  reasons: string[];
  summary: string;
  topicSpecVersion: number;
  assessmentVersion: typeof CONCEPT_SATISFACTION_VERSION;
}

export interface ConceptSatisfactionReport {
  schemaVersion: typeof CONCEPT_SATISFACTION_VERSION;
  retrievalVersion: string;
  reviewedAt: string;
  results: ConceptSatisfactionResult[];
}

function labelsForConcept(review: ConceptReviewSeed, topicSpecId: string, conceptId: string) {
  return review.items.flatMap((item) => {
    if (item.topicSpecId !== topicSpecId || !item.conceptIds.includes(conceptId)) return [];
    const label = item.conceptLabels[conceptId];
    return label ? [{ evidenceUnitId: item.evidenceUnitId, label }] : [];
  });
}

function provisionalStatus(labels: ConceptSupportLabel[], resolution: ConceptSearchResolutionType | null): ProvisionalConceptStatus {
  if (labels.includes("supports")) return "covered";
  if (labels.includes("partial")) return "partial";
  if (labels.length > 0 && labels.every((label) => label === "not-supported")) return "missing";
  if (resolution === "no-explicit-evidence") return "missing";
  return "not-evaluated";
}

function confidenceFor(status: ProvisionalConceptStatus, requiresClinicalReview: boolean, hasReviewedEvidence: boolean): AssessmentConfidence {
  if (requiresClinicalReview) return { level: "low", factors: ["의료진 최종 검토가 필요함", hasReviewedEvidence ? "개념 수준 사전 라벨이 있음" : "직접 근거가 확인되지 않음"] };
  if (status === "not-evaluated") return { level: "low", factors: ["검색 결과가 충분히 검토되지 않음"] };
  if (hasReviewedEvidence) return { level: "medium", factors: ["사람이 검토한 개념 수준 라벨을 사용함", "기준별 라벨은 아직 없음"] };
  return { level: "medium", factors: ["전체 말뭉치 fallback 감사에서 명시적 근거가 확인되지 않음", "콘텐츠 변경 후 재평가가 필요함"] };
}

export function assessConceptSatisfaction(
  specs: CoverageTopicSpec[],
  review: ConceptReviewSeed,
  resolutions: ConceptSearchResolution,
): ConceptSatisfactionReport {
  if (resolutions.schemaVersion !== "concept-search-resolution-v1") throw new Error("지원하지 않는 검색 해소 기준선입니다.");
  if (resolutions.retrievalVersion !== review.retrievalVersion) throw new Error("검색 해소 기준선과 개념 검토 버전이 다릅니다.");
  const specConceptKeys = new Set(specs.flatMap((spec) => spec.concepts.map((concept) => `${spec.id}:${concept.id}`)));
  const resolutionByKey = new Map<string, ConceptSearchResolutionItem>();
  for (const item of resolutions.items) {
    const key = `${item.topicSpecId}:${item.conceptId}`;
    if (!specConceptKeys.has(key)) throw new Error(`검색 해소 대상 개념이 없습니다: ${key}`);
    if (resolutionByKey.has(key)) throw new Error(`검색 해소 대상이 중복됩니다: ${key}`);
    if (item.notes !== item.notes.trim() || !item.notes) throw new Error(`검색 해소 메모가 올바르지 않습니다: ${key}`);
    resolutionByKey.set(key, item);
  }

  const results = specs.flatMap((spec) => spec.concepts.map((concept) => {
    const reviewed = labelsForConcept(review, spec.id, concept.id);
    const resolution = resolutionByKey.get(`${spec.id}:${concept.id}`)?.resolution ?? null;
    const provisional = provisionalStatus(reviewed.map((item) => item.label), resolution);
    const requiresClinicalReview = spec.reviewPolicy.requiresClinicalReview || concept.reviewPolicy?.requiresClinicalReview === true;
    const status: ConceptCoverageStatus = provisional === "not-evaluated"
      ? "not-evaluated"
      : requiresClinicalReview ? "needs-review" : provisional;
    const supportingEvidenceIds = reviewed.filter((item) => item.label === "supports").map((item) => item.evidenceUnitId);
    const partialEvidenceIds = reviewed.filter((item) => item.label === "partial").map((item) => item.evidenceUnitId);
    const rejectedEvidenceIds = reviewed.filter((item) => item.label === "not-supported").map((item) => item.evidenceUnitId);
    const retrievalDisposition = reviewed.length > 0
      ? "reviewed-evidence" as const
      : resolution === "no-explicit-evidence" ? "confirmed-no-explicit-evidence" as const : "search-insufficient" as const;
    const criteria: CriterionCoverageResult[] = concept.criteria.map((criterion) => ({
      criterionId: criterion.id,
      status: "not-evaluated",
      supportingEvidenceIds: [],
      partialEvidenceIds: [],
      contradictingEvidenceIds: [],
      confidence: { level: "low", factors: ["개념 수준 라벨을 기준별 충족으로 확장하지 않음"] },
      reasons: ["기준별 사람 판정 또는 구조화된 근거 범위가 필요함"],
      assessmentVersion: CONCEPT_SATISFACTION_VERSION,
    }));
    const reasons = [
      ...(supportingEvidenceIds.length > 0 ? [`충족 근거 ${supportingEvidenceIds.length}건`] : []),
      ...(partialEvidenceIds.length > 0 ? [`부분 근거 ${partialEvidenceIds.length}건`] : []),
      ...(rejectedEvidenceIds.length > 0 ? [`비충족 후보 ${rejectedEvidenceIds.length}건`] : []),
      ...(resolution === "no-explicit-evidence" ? ["fallback 감사에서 명시적 근거를 찾지 못함"] : []),
      ...(requiresClinicalReview ? ["의료진 최종 검토 전 잠정 상태"] : []),
      "기준별 점수는 계산하지 않음",
    ];
    const summary = provisional === "covered"
      ? "개념을 직접 충족하는 사전 검토 근거가 있다."
      : provisional === "partial" ? "개념의 일부만 설명하는 근거가 있으며 완전 충족으로 보지 않는다."
        : provisional === "missing" ? "검토된 콘텐츠에서 개념을 충족하는 명시적 근거를 확인하지 못했다."
          : "검색과 검토가 충분하지 않아 충족 여부를 판정하지 않는다.";
    return {
      topicSpecId: spec.id,
      conceptId: concept.id,
      status,
      provisionalStatus: provisional,
      coverageScore: null,
      evidence: { supportingEvidenceIds, partialEvidenceIds, rejectedEvidenceIds },
      retrievalDisposition,
      criteria,
      confidence: confidenceFor(provisional, requiresClinicalReview, reviewed.length > 0),
      requiresClinicalReview,
      reasons,
      summary,
      topicSpecVersion: spec.version,
      assessmentVersion: CONCEPT_SATISFACTION_VERSION,
    } satisfies ConceptSatisfactionResult;
  }));
  return {
    schemaVersion: CONCEPT_SATISFACTION_VERSION,
    retrievalVersion: review.retrievalVersion,
    reviewedAt: resolutions.reviewedAt,
    results,
  };
}
