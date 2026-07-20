import { getActiveKeywordTaxonomy } from "../admin-keyword-taxonomy";
import { getActiveSearchAdSnapshotRecord } from "../admin-searchad-snapshots";
import { evaluateOpportunityValueSignals, OPPORTUNITY_MODEL_VERSION } from "../opportunity-scoring";
import type { ConceptSatisfactionResult } from "./concept-satisfaction";
import type { ActionRecommendation, ContentActionType, CoverageTopicSpec } from "./types";

export const ACTION_VALUE_MODEL_VERSION = "action-value-v1" as const;
const MIN_COMPARABLE_VOLUME_COVERAGE = 0.7;

export interface ActionValueInput {
  topicKey: string;
  monthlyVolume: number | null;
  demandScore: number | null;
  patientBusinessValue: number;
  strategicFit: number;
  volumeCoverage: number;
  sourceVersion: string;
}

function normalize(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export async function getCurrentActionValueInputs(specs: CoverageTopicSpec[]): Promise<Record<string, ActionValueInput>> {
  const [activeTaxonomy, snapshot] = await Promise.all([
    getActiveKeywordTaxonomy(),
    getActiveSearchAdSnapshotRecord().catch(() => null),
  ]);
  const snapshotMatchesTaxonomy = snapshot != null
    && (activeTaxonomy.version == null || snapshot.taxonomyVersion === activeTaxonomy.version);
  const directVolumes = new Map(
    (snapshotMatchesTaxonomy ? snapshot.data : [])
      .filter((item) => !item.isRelated)
      .map((item) => [normalize(item.keyword), item.monthlyTotalQcCnt]),
  );
  const topics = activeTaxonomy.taxonomy.flatMap((category) => category.subGroups.map((subGroup) => {
    const volumes = subGroup.keywords
      .map((keyword) => ({ keyword, volume: directVolumes.get(normalize(keyword)) }))
      .filter((item): item is { keyword: string; volume: number } => item.volume != null);
    return {
      key: `${category.slug}:${subGroup.name}` as const,
      category: category.slug,
      subGroup: subGroup.name,
      keywords: subGroup.keywords,
      searchIntent: subGroup.searchIntent,
      monthlyVolume: volumes.length > 0 ? volumes.reduce((sum, item) => sum + item.volume, 0) : null,
      directKeywords: volumes,
    };
  }));
  const volumeCoverage = topics.length > 0
    ? topics.filter((topic) => topic.monthlyVolume != null).length / topics.length
    : 0;
  const comparableDemandAvailable = snapshotMatchesTaxonomy && volumeCoverage >= MIN_COMPARABLE_VOLUME_COVERAGE;
  const signals = new Map(evaluateOpportunityValueSignals(topics).map((signal) => [signal.key, signal]));
  const sourceVersion = [
    ACTION_VALUE_MODEL_VERSION,
    OPPORTUNITY_MODEL_VERSION,
    `taxonomy-${activeTaxonomy.version ?? "code"}`,
    snapshotMatchesTaxonomy ? `searchad-${snapshot.id}` : "searchad-unavailable",
    `coverage-${Math.round(volumeCoverage * 100)}`,
  ].join(":");

  return Object.fromEntries(specs.map((spec) => {
    const topic = topics.find((candidate) => candidate.key === spec.searchTopicKey);
    const signal = signals.get(spec.searchTopicKey);
    return [spec.id, {
      topicKey: spec.searchTopicKey,
      monthlyVolume: topic?.monthlyVolume ?? null,
      demandScore: comparableDemandAvailable ? signal?.demandScore ?? null : null,
      patientBusinessValue: signal?.patientBusinessValue ?? 0,
      strategicFit: signal?.strategicFit ?? 0,
      volumeCoverage,
      sourceVersion,
    }];
  }));
}

export function conceptNeedScore(spec: CoverageTopicSpec, results: ConceptSatisfactionResult[]): number {
  const statusFactor: Record<ConceptSatisfactionResult["provisionalStatus"], number> = {
    covered: 0,
    partial: 0.5,
    missing: 1,
    "not-evaluated": 0,
  };
  const totalWeight = spec.concepts.reduce((sum, concept) => sum + concept.weight, 0);
  if (totalWeight <= 0) return 0;
  const resultByConcept = new Map(results.map((result) => [result.conceptId, result]));
  const missingWeight = spec.concepts.reduce((sum, concept) => {
    const result = resultByConcept.get(concept.id);
    return sum + concept.weight * (result ? statusFactor[result.provisionalStatus] : 0);
  }, 0);
  return Math.round((missingWeight / totalWeight) * 100);
}

function scoreWeights(actionType: ContentActionType) {
  if (actionType === "create-blog" || actionType === "update-blog") return { demand: 0.35, need: 0.35, business: 0.2, strategic: 0.1 };
  if (actionType === "add-faq" || actionType === "update-faq" || actionType === "promote-faq-to-page") return { demand: 0.25, need: 0.35, business: 0.25, strategic: 0.15 };
  return { demand: 0.25, need: 0.4, business: 0.2, strategic: 0.15 };
}

export function assessActionValue(
  actionType: ContentActionType,
  needScore: number,
  input: ActionValueInput | undefined,
): NonNullable<ActionRecommendation["valueAssessment"]> {
  if (!input || input.demandScore == null) {
    return {
      modelVersion: ACTION_VALUE_MODEL_VERSION,
      sourceVersion: input?.sourceVersion ?? `${ACTION_VALUE_MODEL_VERSION}:unavailable`,
      score: null,
      conceptNeedScore: needScore,
      demandScore: null,
      monthlyVolume: input?.monthlyVolume ?? null,
      patientBusinessValue: input?.patientBusinessValue ?? null,
      strategicFit: input?.strategicFit ?? null,
      reasons: ["비교 가능한 검색량 범위가 부족해 실행 가치 점수를 보류했습니다.", `개념 부족도 ${needScore}점`],
    };
  }
  const weights = scoreWeights(actionType);
  const score = Math.round(
    input.demandScore * weights.demand
    + needScore * weights.need
    + input.patientBusinessValue * weights.business
    + input.strategicFit * weights.strategic,
  );
  return {
    modelVersion: ACTION_VALUE_MODEL_VERSION,
    sourceVersion: input.sourceVersion,
    score,
    conceptNeedScore: needScore,
    demandScore: input.demandScore,
    monthlyVolume: input.monthlyVolume,
    patientBusinessValue: input.patientBusinessValue,
    strategicFit: input.strategicFit,
    reasons: [
      `검색 수요 ${input.demandScore}점${input.monthlyVolume == null ? "" : ` · 월 ${input.monthlyVolume.toLocaleString("ko-KR")}회`}`,
      `검토된 개념 부족도 ${needScore}점`,
      `환자 가치 ${input.patientBusinessValue}점 · 전략 적합도 ${input.strategicFit}점`,
    ],
  };
}
