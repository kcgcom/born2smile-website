import { getKeywordCategoryLabel, type KeywordCategorySlug } from "../admin-naver-datalab-keywords";
import type { ActionValueSignalSnapshot, ActionValueTopicSignal } from "./action-value";
import type { CoverageTopicSpec } from "./types";

export const TOPIC_EXPANSION_MODEL_VERSION = "topic-expansion-v1" as const;
const RECOMMENDED_LIMIT = 5;

export type TopicExpansionFlag = "product-led" | "brand-led" | "local-navigation" | "service-scope-review" | "cross-topic-overlap";

const CROSS_TOPIC_OVERLAP_KEYS = new Set([
  "implant:비용/가격",
  "prevention:스케일링",
]);

export interface TopicExpansionCandidate {
  topicKey: `${KeywordCategorySlug}:${string}`;
  category: KeywordCategorySlug;
  categoryLabel: string;
  subGroup: string;
  monthlyVolume: number | null;
  demandScore: number | null;
  patientBusinessValue: number;
  strategicFit: number;
  onboardingScore: number | null;
  status: "recommended" | "manual-review" | "eligible";
  flags: TopicExpansionFlag[];
  reasons: string[];
}

export interface TopicExpansionReport {
  modelVersion: typeof TOPIC_EXPANSION_MODEL_VERSION;
  sourceVersion: string;
  dataStatus: ActionValueSignalSnapshot["dataStatus"];
  recommended: TopicExpansionCandidate[];
  manualReview: TopicExpansionCandidate[];
  eligibleCount: number;
}

function flagsFor(topic: ActionValueTopicSignal): TopicExpansionFlag[] {
  const flags: TopicExpansionFlag[] = [];
  if (topic.key === "prevention:구강관리제품") flags.push("product-led");
  if (topic.key === "dental-choice:브랜드검색" || topic.key === "implant:종류/브랜드") flags.push("brand-led");
  if (topic.key === "dental-choice:김포지역") flags.push("local-navigation");
  if (topic.key === "prosthetics:치아미백") flags.push("service-scope-review");
  if (CROSS_TOPIC_OVERLAP_KEYS.has(topic.key)) flags.push("cross-topic-overlap");
  return flags;
}

function candidateFor(topic: ActionValueTopicSignal): TopicExpansionCandidate {
  const flags = flagsFor(topic);
  const onboardingScore = topic.demandScore == null
    ? null
    : Math.round(topic.demandScore * 0.45 + topic.patientBusinessValue * 0.3 + topic.strategicFit * 0.25);
  return {
    topicKey: topic.key,
    category: topic.category,
    categoryLabel: getKeywordCategoryLabel(topic.category),
    subGroup: topic.subGroup,
    monthlyVolume: topic.monthlyVolume,
    demandScore: topic.demandScore,
    patientBusinessValue: topic.patientBusinessValue,
    strategicFit: topic.strategicFit,
    onboardingScore,
    status: flags.length > 0 ? "manual-review" : "eligible",
    flags,
    reasons: onboardingScore == null
      ? ["비교 가능한 검색량이 없어 온보딩 우선순위를 보류했습니다."]
      : [
          `검색 수요 ${topic.demandScore}점 · 월 ${topic.monthlyVolume?.toLocaleString("ko-KR") ?? "-"}회`,
          `환자 가치 ${topic.patientBusinessValue}점 · 전략 적합도 ${topic.strategicFit}점`,
        ],
  };
}

export function buildTopicExpansionReport(
  snapshot: ActionValueSignalSnapshot,
  activeSpecs: CoverageTopicSpec[],
): TopicExpansionReport {
  const activeKeys = new Set(activeSpecs.map((spec) => spec.searchTopicKey));
  const candidates = snapshot.topics
    .filter((topic) => !activeKeys.has(topic.key))
    .map(candidateFor)
    .sort((a, b) => (b.onboardingScore ?? -1) - (a.onboardingScore ?? -1) || (b.monthlyVolume ?? -1) - (a.monthlyVolume ?? -1));
  const recommended: TopicExpansionCandidate[] = [];
  const selectedCategories = new Set<KeywordCategorySlug>();
  for (const candidate of candidates) {
    if (candidate.status === "manual-review" || candidate.onboardingScore == null || selectedCategories.has(candidate.category)) continue;
    recommended.push({ ...candidate, status: "recommended", reasons: [...candidate.reasons, "현재 확장 묶음의 카테고리 대표 후보입니다."] });
    selectedCategories.add(candidate.category);
    if (recommended.length === RECOMMENDED_LIMIT) break;
  }

  return {
    modelVersion: TOPIC_EXPANSION_MODEL_VERSION,
    sourceVersion: snapshot.sourceVersion,
    dataStatus: snapshot.dataStatus,
    recommended,
    manualReview: candidates.filter((candidate) => candidate.status === "manual-review").slice(0, RECOMMENDED_LIMIT),
    eligibleCount: candidates.filter((candidate) => candidate.status !== "manual-review" && candidate.onboardingScore != null).length,
  };
}
