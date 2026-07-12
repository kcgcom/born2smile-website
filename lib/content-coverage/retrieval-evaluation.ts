import { GEMINI_EMBEDDING_DIMS, GEMINI_EMBEDDING_MODEL } from "../gemini-embeddings";
import type { LexicalEvidenceCandidate } from "./lexical-retrieval";
import type { SemanticEvidenceCandidate } from "./semantic-retrieval";
import type { CoverageTopicSpec } from "./types";

export type RetrievalReviewLabel = "relevant" | "partial" | "irrelevant" | null;

export const RETRIEVAL_REASON_TAGS = [
  "direct-answer", "required-concept", "supporting-concept",
  "too-narrow", "brief-mention", "adjacent-topic", "wrong-surface-context",
  "wrong-treatment", "wrong-patient", "keyword-collision", "incidental-mention", "promotional-only",
] as const;
export type RetrievalReasonTag = (typeof RETRIEVAL_REASON_TAGS)[number];

export interface RetrievalReviewItem {
  id: string;
  topicSpecId: string;
  topicLabel: string;
  rank: number;
  documentId: string;
  evidenceUnitId: string;
  title: string;
  headingPath: string[];
  path: string | null;
  similarity: number;
  foundByLexical: boolean;
  excerpt: string;
  label: RetrievalReviewLabel;
  reasonTags: string[];
  notes: string;
}

export interface RetrievalReviewFile {
  schemaVersion: "retrieval-review-v1";
  model: string;
  dimensions: number;
  generatedAt: string;
  instructions: string;
  items: RetrievalReviewItem[];
}

export const RETRIEVAL_QUALITY_THRESHOLDS = {
  usablePrecisionAt3: 0.8,
  irrelevantRateAt10: 0.2,
  lexicalDocumentRediscovery: 0.8,
} as const;

export function buildRetrievalReviewItems(
  specs: CoverageTopicSpec[],
  semantic: Record<string, SemanticEvidenceCandidate[]>,
  lexical: Record<string, LexicalEvidenceCandidate[]>,
  previousItems: RetrievalReviewItem[] = [],
): RetrievalReviewItem[] {
  const previous = new Map(previousItems.map((item) => [item.id, item]));
  return specs.flatMap((spec) => {
    const lexicalIds = new Set((lexical[spec.id] ?? []).map((candidate) => candidate.evidenceUnitId));
    return (semantic[spec.id] ?? []).map((candidate, index) => {
      const id = `${GEMINI_EMBEDDING_MODEL}:${spec.id}:${candidate.evidenceUnitId}`;
      const saved = previous.get(id);
      return {
        id,
        topicSpecId: spec.id,
        topicLabel: spec.label,
        rank: index + 1,
        documentId: candidate.documentId,
        evidenceUnitId: candidate.evidenceUnitId,
        title: candidate.title,
        headingPath: candidate.headingPath,
        path: candidate.path,
        similarity: Math.round(candidate.similarity * 10_000) / 10_000,
        foundByLexical: lexicalIds.has(candidate.evidenceUnitId),
        excerpt: candidate.excerpt,
        label: saved?.label ?? null,
        reasonTags: saved?.reasonTags ?? [],
        notes: saved?.notes ?? "",
      } satisfies RetrievalReviewItem;
    });
  });
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000;
}

export function evaluateRetrievalReview(
  file: RetrievalReviewFile,
  lexical: Record<string, LexicalEvidenceCandidate[]>,
) {
  const topicIds = [...new Set(file.items.map((item) => item.topicSpecId))];
  const topics = topicIds.map((topicSpecId) => {
    const items = file.items.filter((item) => item.topicSpecId === topicSpecId);
    const labeled = items.filter((item) => item.label != null);
    const top3 = items.filter((item) => item.rank <= 3 && item.label != null);
    const relevantTop3 = top3.filter((item) => item.label === "relevant").length;
    const usableTop3 = top3.filter((item) => item.label === "relevant" || item.label === "partial").length;
    const irrelevant = labeled.filter((item) => item.label === "irrelevant").length;
    const semanticDocuments = new Set(items.map((item) => item.documentId));
    const lexicalDocuments = new Set((lexical[topicSpecId] ?? []).map((item) => item.documentId));
    const rediscoveredDocuments = [...lexicalDocuments].filter((documentId) => semanticDocuments.has(documentId)).length;
    return {
      topicSpecId,
      total: items.length,
      labeled: labeled.length,
      strictPrecisionAt3: ratio(relevantTop3, top3.length),
      usablePrecisionAt3: ratio(usableTop3, top3.length),
      irrelevantRateAt10: ratio(irrelevant, labeled.length),
      lexicalDocumentRediscovery: ratio(rediscoveredDocuments, lexicalDocuments.size),
    };
  });
  const complete = file.items.length > 0 && file.items.every((item) => item.label != null);
  const passing = complete && topics.every((topic) =>
    (topic.usablePrecisionAt3 ?? 0) >= RETRIEVAL_QUALITY_THRESHOLDS.usablePrecisionAt3
    && (topic.irrelevantRateAt10 ?? 1) <= RETRIEVAL_QUALITY_THRESHOLDS.irrelevantRateAt10
    && (topic.lexicalDocumentRediscovery == null || topic.lexicalDocumentRediscovery >= RETRIEVAL_QUALITY_THRESHOLDS.lexicalDocumentRediscovery));
  return {
    verdict: complete ? (passing ? "pass" : "fail") : "incomplete",
    model: file.model,
    dimensions: file.dimensions,
    thresholds: RETRIEVAL_QUALITY_THRESHOLDS,
    total: file.items.length,
    labeled: file.items.filter((item) => item.label != null).length,
    remaining: file.items.filter((item) => item.label == null).length,
    topics,
  };
}

export function createRetrievalReviewFile(items: RetrievalReviewItem[], generatedAt = new Date().toISOString()): RetrievalReviewFile {
  return {
    schemaVersion: "retrieval-review-v1",
    model: GEMINI_EMBEDDING_MODEL,
    dimensions: GEMINI_EMBEDDING_DIMS,
    generatedAt,
    instructions: "label은 relevant(주제를 직접 설명), partial(일부 기준만 관련), irrelevant(다른 주제) 중 하나로 입력하고 notes에는 판단 근거를 적습니다.",
    items,
  };
}
