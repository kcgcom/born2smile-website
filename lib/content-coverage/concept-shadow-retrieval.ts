import { cosineSimilarity } from "../gemini-embeddings";
import { buildSemanticSearchVectors } from "./semantic-retrieval";
import type { ContentDocument, CoverageConcept, CoverageTopicSpec, EvidenceUnit } from "./types";

export const CONCEPT_SHADOW_RETRIEVAL_VERSION = "retrieval-v2-shadow.4" as const;

const STOP_WORDS = new Set([
  "치과", "치료", "관련", "대한", "위한", "방법", "내용", "설명", "설명한다", "필요", "경우", "기준", "정보", "환자", "일반", "주요", "확인", "글", "다룬", "중심", "단순",
]);

type QueryDescriptor =
  | { kind: "topic"; topicSpecId: string; text: string }
  | { kind: "concept"; topicSpecId: string; conceptId: string; text: string }
  | { kind: "exclusion"; topicSpecId: string; text: string };

export interface ConceptEvidenceCandidate {
  topicSpecId: string;
  conceptId: string;
  matchedConceptIds: string[];
  documentId: string;
  evidenceUnitId: string;
  contentHash: string;
  title: string;
  headingPath: string[];
  path: string | null;
  surface: string | null;
  kind: EvidenceUnit["kind"];
  role: EvidenceUnit["role"];
  semanticRank: number;
  lexicalRank: number | null;
  topicScopeRank: number;
  topicScopeScore: number;
  conceptScore: number;
  conceptIdentityScore: number;
  lexicalCriterionScore: number;
  rerankScore: number;
  matchedCriteria: string[];
  identityMatches: string[];
  contextMatches: string[];
  scopeWarnings: string[];
  exclusionMatches: string[];
  evidenceLevel: "direct" | "supporting" | "discovery-only";
  reasons: string[];
  excerpt: string;
}

export interface ConceptShadowRetrievalResult {
  version: typeof CONCEPT_SHADOW_RETRIEVAL_VERSION;
  generatedAt: string;
  cache: { hits: number; misses: number };
  topics: Record<string, {
    byConcept: Record<string, ConceptEvidenceCandidate[]>;
    integrated: ConceptEvidenceCandidate[];
  }>;
  fallbackAudit?: ConceptFallbackAudit;
}

export interface ConceptFallbackAuditTarget {
  topicSpecId: string;
  conceptId: string;
}

export interface ConceptFallbackAuditCandidate {
  rank: number;
  documentId: string;
  evidenceUnitId: string;
  title: string;
  headingPath: string[];
  path: string | null;
  surface: string | null;
  kind: EvidenceUnit["kind"];
  excerpt: string;
  fallbackScore: number;
  conceptSimilarity: number;
  conceptPercentile: number;
  topicPercentile: number;
  identityScore: number;
  criterionScore: number;
  identityMatches: string[];
  contextMatches: string[];
  matchedCriteria: string[];
  exclusionMatches: string[];
  strictAccepted: boolean;
  rejectionCodes: Array<
    | "identity-not-explicit"
    | "required-context-missing"
    | "topic-scope-below-threshold"
    | "semantic-and-criteria-below-threshold"
    | "explicit-exclusion"
  >;
  rejectionReasons: string[];
}

export interface ConceptFallbackAudit {
  targets: Record<string, {
    topicSpecId: string;
    conceptId: string;
    candidates: ConceptFallbackAuditCandidate[];
  }>;
}

function tokenize(value: string): string[] {
  const suffixes = ["으로", "에서", "까지", "부터", "에게", "처럼", "보다", "하고", "하며", "하면", "한다", "되는", "대한", "위한", "과", "와", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "중", "후", "전"];
  return [...new Set((value.normalize("NFKC").toLowerCase().match(/[가-힣a-z0-9]+/g) ?? []).map((token) => {
    const suffix = suffixes.find((candidate) => token.length > candidate.length + 1 && token.endsWith(candidate));
    return suffix ? token.slice(0, -suffix.length) : token;
  }))].filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function queryDescriptors(specs: CoverageTopicSpec[]): QueryDescriptor[] {
  return specs.flatMap((spec) => [
    { kind: "topic", topicSpecId: spec.id, text: `주제: ${spec.label}\n주제 범위: ${spec.description}` } as const,
    ...spec.concepts.map((concept) => ({
      kind: "concept" as const,
      topicSpecId: spec.id,
      conceptId: concept.id,
      text: [
        `주제: ${spec.label}`,
        `평가 개념: ${concept.label}`,
        `개념 설명: ${concept.description}`,
        ...(concept.retrievalHints?.identityPhrases.map((phrase) => `개념 식별 표현: ${phrase}`) ?? []),
        ...concept.criteria.map((criterion) => `판정 기준: ${criterion.label}: ${criterion.description}`),
      ].join("\n"),
    })),
    ...spec.exclusions.map((exclusion) => ({
      kind: "exclusion" as const,
      topicSpecId: spec.id,
      text: `${spec.label}와 혼동하기 쉬운 별도 콘텐츠: ${exclusion}`,
    })),
  ]);
}

function percentileRanks(scores: number[]): number[] {
  const sorted = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score || a.index - b.index);
  const denominator = Math.max(1, scores.length - 1);
  const result = Array<number>(scores.length);
  sorted.forEach((item, rank) => { result[item.index] = 1 - rank / denominator; });
  return result;
}

function tokenCoverage(needles: string[], haystack: Set<string>): number {
  if (needles.length === 0) return 0;
  return needles.filter((token) => haystack.has(token)).length / needles.length;
}

function phraseFeatures(phrases: string[], text: string, textTokens: Set<string>): { score: number; matches: string[] } {
  const normalizedText = normalize(text);
  const matches = phrases.filter((phrase) => normalizedText.includes(normalize(phrase)));
  if (matches.length > 0) return { score: 1, matches };
  return {
    score: phrases.length === 0 ? 0 : Math.max(...phrases.map((phrase) => tokenCoverage(tokenize(phrase), textTokens))),
    matches: [],
  };
}

function criterionFeatures(concept: CoverageConcept, textTokens: Set<string>): { score: number; matched: string[] } {
  const results = concept.criteria.map((criterion) => {
    const tokens = tokenize(`${criterion.label} ${criterion.description}`);
    return { criterion, coverage: tokenCoverage(tokens, textTokens) };
  });
  return {
    score: results.length === 0 ? 0 : Math.max(...results.map((item) => item.coverage)),
    matched: results.filter((item) => item.coverage >= 0.35).map((item) => item.criterion.id),
  };
}

function specificity(kind: EvidenceUnit["kind"]): number {
  if (kind === "summary") return 0.2;
  if (kind === "section" || kind === "faq" || kind === "process-step" || kind === "table" || kind === "list") return 1;
  return 0.7;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function topIndices(values: number[], limit: number, eligible: (index: number) => boolean = () => true): number[] {
  return values.map((value, index) => ({ value, index })).filter((item) => eligible(item.index)).sort((a, b) => b.value - a.value || a.index - b.index).slice(0, limit).map((item) => item.index);
}

function rankOf(index: number, ordered: number[]): number {
  const rank = ordered.indexOf(index);
  return rank < 0 ? ordered.length + 1 : rank + 1;
}

function candidatePool(semanticScores: number[], topicScores: number[], identityScores: number[]): Set<number> {
  return new Set([
    ...topIndices(semanticScores, 200),
    ...topIndices(identityScores, 50, (index) => identityScores[index] > 0),
    ...topIndices(topicScores, 200, (index) => identityScores[index] > 0),
  ]);
}

function selectIntegrated(
  spec: CoverageTopicSpec,
  byConcept: Record<string, ConceptEvidenceCandidate[]>,
  conceptsByEvidence: Map<string, string[]>,
  limit: number,
): ConceptEvidenceCandidate[] {
  const all = Object.values(byConcept).flat().filter((candidate) => candidate.evidenceLevel !== "discovery-only");
  const selected: ConceptEvidenceCandidate[] = [];
  const selectedIds = new Set<string>();
  const perDocument = new Map<string, number>();
  const add = (candidate: ConceptEvidenceCandidate | undefined, allowDocumentOverflow = false) => {
    if (!candidate || selectedIds.has(candidate.evidenceUnitId)
      || (!allowDocumentOverflow && (perDocument.get(candidate.documentId) ?? 0) >= 2)) return;
    selected.push({ ...candidate, matchedConceptIds: conceptsByEvidence.get(candidate.evidenceUnitId) ?? [candidate.conceptId] });
    selectedIds.add(candidate.evidenceUnitId);
    perDocument.set(candidate.documentId, (perDocument.get(candidate.documentId) ?? 0) + 1);
  };

  const orderedConcepts = [...spec.concepts].sort((a, b) => Number(a.importance === "recommended") - Number(b.importance === "recommended"));
  for (const concept of orderedConcepts) {
    const preferred = byConcept[concept.id]?.find((candidate) => candidate.evidenceLevel !== "discovery-only"
      && !selectedIds.has(candidate.evidenceUnitId)
      && (perDocument.get(candidate.documentId) ?? 0) < 2);
    const fallback = byConcept[concept.id]?.find((candidate) => candidate.evidenceLevel !== "discovery-only"
      && !selectedIds.has(candidate.evidenceUnitId));
    add(preferred ?? fallback, !preferred && fallback != null);
    if (selected.length >= limit) return selected;
  }
  for (const candidate of [...all].sort((a, b) => b.rerankScore - a.rerankScore || a.evidenceUnitId.localeCompare(b.evidenceUnitId))) {
    add(candidate);
    if (selected.length >= limit) break;
  }
  return selected.sort((a, b) => b.rerankScore - a.rerankScore
    || Number(a.evidenceLevel === "discovery-only") - Number(b.evidenceLevel === "discovery-only")
    || a.evidenceUnitId.localeCompare(b.evidenceUnitId));
}

export async function buildConceptShadowRetrieval(
  specs: CoverageTopicSpec[],
  documents: ContentDocument[],
  options: {
    conceptLimit?: number;
    topicLimit?: number;
    cachePath?: string;
    fallbackAuditTargets?: ConceptFallbackAuditTarget[];
    fallbackAuditLimit?: number;
  } = {},
): Promise<ConceptShadowRetrievalResult> {
  const descriptors = queryDescriptors(specs);
  const search = await buildSemanticSearchVectors(descriptors.map((descriptor) => descriptor.text), documents, { cachePath: options.cachePath });
  const queryScores = descriptors.map((_, queryIndex) => search.documentVectors.map((vector) => cosineSimilarity(search.queryVectors[queryIndex], vector)));
  const queryPercentiles = queryScores.map(percentileRanks);
  const topicDescriptorIndex = new Map<string, number>();
  const conceptDescriptorIndex = new Map<string, number>();
  const exclusionDescriptorIndices = new Map<string, number[]>();
  descriptors.forEach((descriptor, index) => {
    if (descriptor.kind === "topic") topicDescriptorIndex.set(descriptor.topicSpecId, index);
    if (descriptor.kind === "concept") conceptDescriptorIndex.set(`${descriptor.topicSpecId}:${descriptor.conceptId}`, index);
    if (descriptor.kind === "exclusion") exclusionDescriptorIndices.set(descriptor.topicSpecId, [...(exclusionDescriptorIndices.get(descriptor.topicSpecId) ?? []), index]);
  });

  const topics: ConceptShadowRetrievalResult["topics"] = {};
  const fallbackTargetKeys = new Set((options.fallbackAuditTargets ?? []).map((target) => `${target.topicSpecId}:${target.conceptId}`));
  const fallbackAudit: ConceptFallbackAudit = { targets: {} };
  for (const spec of specs) {
    const topicIndex = topicDescriptorIndex.get(spec.id);
    if (topicIndex == null) throw new Error(`주제 정체성 질의가 없습니다: ${spec.id}`);
    const topicScores = queryScores[topicIndex];
    const topicPercentiles = queryPercentiles[topicIndex];
    const topicOrder = topIndices(topicScores, topicScores.length);
    const exclusions = exclusionDescriptorIndices.get(spec.id) ?? [];
    const topicTokens = tokenize(`${spec.label} ${spec.searchTopicKey.slice(spec.searchTopicKey.indexOf(":") + 1)}`);
    const expectedCategory = spec.searchTopicKey.slice(0, spec.searchTopicKey.indexOf(":"));
    const byConcept: Record<string, ConceptEvidenceCandidate[]> = {};
    const acceptedConceptsByEvidence = new Map<string, string[]>();

    for (const concept of spec.concepts) {
      const conceptIndex = conceptDescriptorIndex.get(`${spec.id}:${concept.id}`);
      if (conceptIndex == null) throw new Error(`개념 질의가 없습니다: ${spec.id}:${concept.id}`);
      const semanticScores = queryScores[conceptIndex];
      const semanticPercentiles = queryPercentiles[conceptIndex];
      const semanticOrder = topIndices(semanticScores, semanticScores.length);
      const identityPhrases = concept.retrievalHints?.identityPhrases ?? [concept.label];
      const contextPhrases = concept.retrievalHints?.contextPhrases ?? [];
      const featureRows = search.units.map((unit, unitIndex) => {
        const sectionHeading = unit.evidence.headingPath.at(-1) ?? "";
        const text = `${sectionHeading} ${unit.evidence.text}`;
        const documentScopeText = `${unit.document.title} ${unit.document.description ?? ""} ${unit.document.units.map((evidence) => evidence.text).join(" ")}`;
        const textTokens = new Set(tokenize(text));
        const identity = phraseFeatures(identityPhrases, text, textTokens);
        const context = phraseFeatures(contextPhrases, text, textTokens);
        const contextAccepted = contextPhrases.length === 0 || context.matches.length > 0;
        const criterion = criterionFeatures(concept, textTokens);
        const anchorCoverage = tokenCoverage(topicTokens, textTokens);
        const categorySignal = unit.document.category === expectedCategory ? 1 : 0.5;
        const scopeScore = anchorCoverage * 0.7 + categorySignal * 0.3;
        const exclusionMatches = (spec.retrievalExclusionPhrases ?? spec.exclusions)
          .filter((exclusion) => normalize(documentScopeText).includes(normalize(exclusion)));
        const exclusionPercentile = exclusions.length === 0 ? 0 : Math.max(...exclusions.map((index) => queryPercentiles[index][unitIndex]));
        const semanticExclusion = exclusionPercentile >= 0.985 && exclusionPercentile > semanticPercentiles[unitIndex] + 0.02;
        const explicitCriterionOverride = identity.matches.length > 0
          && contextAccepted
          && criterion.matched.length > 0
          && semanticPercentiles[unitIndex] >= 0.95;
        const explicitIdentityAccepted = identity.matches.length > 0
          && ((topicPercentiles[unitIndex] >= 0.75
            && (semanticPercentiles[unitIndex] >= 0.8 || criterion.matched.length > 0))
            || explicitCriterionOverride);
        const accepted = contextAccepted
          && exclusionMatches.length === 0
          && explicitIdentityAccepted;
        const rerankScore = Math.max(0, semanticPercentiles[unitIndex] * 0.3
          + identity.score * 0.3
          + topicPercentiles[unitIndex] * 0.15
          + criterion.score * 0.1
          + scopeScore * 0.1
          + specificity(unit.evidence.kind) * 0.05
          - (unit.evidence.kind === "summary" ? 0.08 : 0)
          - (semanticExclusion ? 0.15 : 0));
        return { identity, context, accepted, explicitCriterionOverride, criterion, scopeScore, exclusionMatches, semanticExclusion, rerankScore };
      });
      const identityScores = featureRows.map((row) => row.identity.score);
      const lexicalScores = featureRows.map((row) => row.criterion.score);
      const lexicalOrder = topIndices(lexicalScores, lexicalScores.length, (index) => lexicalScores[index] > 0);
      const pool = new Set([
        ...candidatePool(semanticScores, topicScores, identityScores),
        ...featureRows.flatMap((row, unitIndex) => row.identity.matches.length > 0 ? [unitIndex] : []),
      ]);
      const ranked = [...pool].filter((unitIndex) => featureRows[unitIndex].accepted).map((unitIndex) => {
        const unit = search.units[unitIndex];
        const row = featureRows[unitIndex];
        const placement = unit.evidence.placements.find((candidate) => candidate.visible && candidate.indexable) ?? null;
        const discoveryOnly = unit.evidence.kind === "summary";
        const evidenceLevel: ConceptEvidenceCandidate["evidenceLevel"] = discoveryOnly
          ? "discovery-only"
          : row.identity.matches.length > 0 && row.criterion.matched.length > 0 ? "direct" : "supporting";
        const scopeWarnings = [
          ...(row.semanticExclusion ? ["제외 범위 의미 유사도가 높음"] : []),
          ...(unit.evidence.kind === "summary" ? ["요약문"] : []),
          ...(unit.document.category && unit.document.category !== expectedCategory ? [`다른 카테고리: ${unit.document.category}`] : []),
        ];
        return {
          topicSpecId: spec.id,
          conceptId: concept.id,
          matchedConceptIds: [concept.id],
          documentId: unit.document.id,
          evidenceUnitId: unit.evidence.id,
          contentHash: unit.evidence.contentHash,
          title: unit.document.title,
          headingPath: unit.evidence.headingPath,
          path: placement?.path ?? null,
          surface: placement?.surface ?? null,
          kind: unit.evidence.kind,
          role: unit.evidence.role,
          semanticRank: rankOf(unitIndex, semanticOrder),
          lexicalRank: row.criterion.score > 0 ? rankOf(unitIndex, lexicalOrder) : null,
          topicScopeRank: rankOf(unitIndex, topicOrder),
          topicScopeScore: round(row.scopeScore),
          conceptScore: round(semanticScores[unitIndex]),
          conceptIdentityScore: round(row.identity.score),
          lexicalCriterionScore: round(row.criterion.score),
          rerankScore: round(row.rerankScore),
          matchedCriteria: row.criterion.matched,
          identityMatches: row.identity.matches,
          contextMatches: row.context.matches,
          scopeWarnings,
          exclusionMatches: row.exclusionMatches,
          evidenceLevel,
          reasons: [
            `개념 의미 순위 ${rankOf(unitIndex, semanticOrder)}위`,
            `주제 정체성 순위 ${rankOf(unitIndex, topicOrder)}위`,
            ...(row.identity.matches.length > 0 ? [`개념 식별 표현 ${row.identity.matches.join(", ")}`] : []),
            ...(row.context.matches.length > 0 ? [`필수 문맥 ${row.context.matches.join(", ")}`] : []),
            ...(row.criterion.matched.length > 0 ? [`기준 일치 ${row.criterion.matched.join(", ")}`] : []),
            ...(discoveryOnly ? ["상세 설명이 없는 요약문"] : []),
          ],
          excerpt: unit.evidence.text.replace(/\s+/g, " ").trim().slice(0, 220),
        } satisfies ConceptEvidenceCandidate;
      }).sort((a, b) => b.rerankScore - a.rerankScore || a.semanticRank - b.semanticRank || a.evidenceUnitId.localeCompare(b.evidenceUnitId));

      const fallbackKey = `${spec.id}:${concept.id}`;
      if (fallbackTargetKeys.has(fallbackKey)) {
        const auditRows = search.units.map((unit, unitIndex) => {
          const row = featureRows[unitIndex];
          const placement = unit.evidence.placements.find((candidate) => candidate.visible && candidate.indexable) ?? null;
          const contextAccepted = contextPhrases.length === 0 || row.context.matches.length > 0;
          const semanticOrCriterionAccepted = semanticPercentiles[unitIndex] >= 0.8 || row.criterion.matched.length > 0;
          const rejectionCodes: ConceptFallbackAuditCandidate["rejectionCodes"] = [
            ...(row.identity.matches.length === 0 ? ["identity-not-explicit" as const] : []),
            ...(!contextAccepted ? ["required-context-missing" as const] : []),
            ...(topicPercentiles[unitIndex] < 0.75 && !row.explicitCriterionOverride ? ["topic-scope-below-threshold" as const] : []),
            ...(!semanticOrCriterionAccepted ? ["semantic-and-criteria-below-threshold" as const] : []),
            ...(row.exclusionMatches.length > 0 ? ["explicit-exclusion" as const] : []),
          ];
          const rejectionReasons = [
            ...(row.identity.matches.length === 0 ? ["식별 표현이 본문에 명시되지 않음"] : []),
            ...(!contextAccepted ? ["필수 문맥 표현이 본문에 없음"] : []),
            ...(topicPercentiles[unitIndex] < 0.75 && !row.explicitCriterionOverride ? ["주제 정체성 순위가 수용 기준보다 낮음"] : []),
            ...(!semanticOrCriterionAccepted ? ["개념 의미 순위와 기준 일치가 모두 부족함"] : []),
            ...(row.exclusionMatches.length > 0 ? ["문서 전체에 제외 표현이 있음"] : []),
          ];
          const fallbackScore = Math.max(0,
            semanticPercentiles[unitIndex] * 0.35
            + row.identity.score * 0.25
            + topicPercentiles[unitIndex] * 0.15
            + row.criterion.score * 0.15
            + row.scopeScore * 0.1
            - (row.exclusionMatches.length > 0 ? 0.25 : 0)
            - (unit.evidence.kind === "summary" ? 0.05 : 0));
          return {
            documentId: unit.document.id,
            evidenceUnitId: unit.evidence.id,
            title: unit.document.title,
            headingPath: unit.evidence.headingPath,
            path: placement?.path ?? null,
            surface: placement?.surface ?? null,
            kind: unit.evidence.kind,
            excerpt: unit.evidence.text.replace(/\s+/g, " ").trim().slice(0, 320),
            fallbackScore: round(fallbackScore),
            conceptSimilarity: round(semanticScores[unitIndex]),
            conceptPercentile: round(semanticPercentiles[unitIndex]),
            topicPercentile: round(topicPercentiles[unitIndex]),
            identityScore: round(row.identity.score),
            criterionScore: round(row.criterion.score),
            identityMatches: row.identity.matches,
            contextMatches: row.context.matches,
            matchedCriteria: row.criterion.matched,
            exclusionMatches: row.exclusionMatches,
            strictAccepted: row.accepted,
            rejectionCodes,
            rejectionReasons,
          };
        }).sort((left, right) => right.fallbackScore - left.fallbackScore
          || right.conceptPercentile - left.conceptPercentile
          || left.evidenceUnitId.localeCompare(right.evidenceUnitId));
        const candidates: ConceptFallbackAuditCandidate[] = [];
        const perDocument = new Map<string, number>();
        for (const row of auditRows) {
          const documentCount = perDocument.get(row.documentId) ?? 0;
          if (documentCount >= 2) continue;
          candidates.push({ rank: candidates.length + 1, ...row });
          perDocument.set(row.documentId, documentCount + 1);
          if (candidates.length >= (options.fallbackAuditLimit ?? 10)) break;
        }
        fallbackAudit.targets[fallbackKey] = { topicSpecId: spec.id, conceptId: concept.id, candidates };
      }

      for (const candidate of ranked) {
        const matchedConcepts = acceptedConceptsByEvidence.get(candidate.evidenceUnitId) ?? [];
        if (!matchedConcepts.includes(concept.id)) matchedConcepts.push(concept.id);
        acceptedConceptsByEvidence.set(candidate.evidenceUnitId, matchedConcepts);
      }

      const selected: ConceptEvidenceCandidate[] = [];
      const documentsSeen = new Set<string>();
      for (const candidate of ranked) {
        if (documentsSeen.has(candidate.documentId)) continue;
        selected.push(candidate);
        documentsSeen.add(candidate.documentId);
        if (selected.length >= (options.conceptLimit ?? 5)) break;
      }
      byConcept[concept.id] = selected;
    }
    topics[spec.id] = {
      byConcept,
      integrated: selectIntegrated(spec, byConcept, acceptedConceptsByEvidence, options.topicLimit ?? 10),
    };
  }

  return {
    version: CONCEPT_SHADOW_RETRIEVAL_VERSION,
    generatedAt: new Date().toISOString(),
    cache: search.cache,
    topics,
    ...(fallbackTargetKeys.size > 0 ? { fallbackAudit } : {}),
  };
}
