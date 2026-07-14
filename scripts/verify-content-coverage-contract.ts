import assert from "node:assert/strict";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import conceptReviewSeedJson from "../lib/content-coverage/generated/concept-review-seed.json";
import retrievalReviewBaselineJson from "../lib/content-coverage/generated/retrieval-review-baseline.json";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import { applyRetrievalReviewBaseline, buildRetrievalReviewItems, createRetrievalReviewFile, evaluateRetrievalReview, summarizeRetrievalReviewReasons, type RetrievalReviewBaseline } from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS, validateCoverageTopicSpecs } from "../lib/content-coverage/topic-specs";
import { CONTENT_COVERAGE_ENGINE_VERSION, EVIDENCE_SCHEMA_VERSION } from "../lib/content-coverage/types";
import type { ConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { TREATMENT_DETAILS } from "../lib/treatments";
import { cosineSimilarity, formatEmbeddingSearchDocument, formatEmbeddingSearchQuery } from "../lib/gemini-embeddings";

validateCoverageTopicSpecs();
assert.equal(COVERAGE_TOPIC_SPECS.length, 5, "대표 주제 명세는 초기 검증 대상 5개여야 합니다.");
assert.equal(new Set(COVERAGE_TOPIC_SPECS.map((spec) => spec.searchTopicKey)).size, COVERAGE_TOPIC_SPECS.length);
assert.equal(COVERAGE_TOPIC_SPECS.every((spec) => spec.concepts.some((concept) => concept.importance === "required")), true);
assert.equal(COVERAGE_TOPIC_SPECS.every((spec) => spec.actionPolicy.allowedActions.includes("no-action")), true);
assert.equal(COVERAGE_TOPIC_SPECS.every((spec) => spec.retrievalExclusionPhrases && spec.retrievalExclusionPhrases.length > 0), true, "개념 검색용 제외 표현이 필요합니다.");
assert.equal(COVERAGE_TOPIC_SPECS.every((spec) => spec.concepts.every((concept) => concept.retrievalHints && concept.retrievalHints.identityPhrases.length > 0)), true, "모든 개념에 검색 식별 표현이 필요합니다.");

const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
const generatedAt = "2026-01-01T00:00:00.000Z";
const evidence = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, generatedAt);
const repeated = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, generatedAt);
const units = evidence.documents.flatMap((document) => document.units);
assert.deepEqual(evidence, repeated, "같은 입력의 근거 스냅샷은 완전히 동일해야 합니다.");
assert.equal(new Set(evidence.documents.map((document) => document.id)).size, evidence.documents.length, "문서 ID가 중복됩니다.");
assert.equal(new Set(units.map((unit) => unit.id)).size, units.length, "근거 단위 ID가 중복됩니다.");
assert.equal(units.every((unit) => unit.text.trim().length > 0 && unit.contentHash.length === 64), true, "빈 근거나 잘못된 해시가 있습니다.");
assert.equal(units.some((unit) => unit.role === "navigation"), true, "탐색용 콘텐츠 역할이 보존되어야 합니다.");
const treatmentFaqs = units.filter((unit) => unit.documentId.startsWith("treatment:") && unit.kind === "faq");
assert.equal(treatmentFaqs.every((unit) => unit.placements.some((placement) => placement.surface === "treatment-page") && unit.placements.some((placement) => placement.surface === "faq")), true, "진료 FAQ는 하나의 근거에 두 노출 위치를 가져야 합니다.");
assert.equal(evidence.stats.duplicatePlacementCount, treatmentFaqs.length, "중복 노출 집계는 공유 FAQ 수와 일치해야 합니다.");

const lexical = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, evidence.documents, 10);
const repeatedLexical = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, evidence.documents, 10);
assert.deepEqual(lexical, repeatedLexical, "정확 검색 기준선은 같은 입력에서 동일해야 합니다.");
assert.equal(Object.values(lexical).flat().every((candidate) => candidate.role !== "navigation"), true, "탐색용 근거가 검색 후보에 포함되면 안 됩니다.");
assert.equal(Object.values(lexical).every((candidates) => new Set(candidates.map((candidate) => candidate.evidenceUnitId)).size === candidates.length), true, "같은 근거가 한 주제에 중복 노출되면 안 됩니다.");
assert.equal(lexical["pediatric-dental-trauma"][0]?.documentId, "blog:children-dental-trauma", "소아 외상 기준선의 최상위는 직접 외상 콘텐츠여야 합니다.");
assert.equal(lexical["orthodontics-pain-risks"].some((candidate) => candidate.documentId === "blog:airflow-scaling-benefits"), false, "정확 구문 없는 타 카테고리 콘텐츠를 토큰만으로 교정 근거에 포함하면 안 됩니다.");
assert.equal(formatEmbeddingSearchQuery("교정 통증"), "task: search result | query: 교정 통증", "Gemini 2 검색 질의 형식이 달라졌습니다.");
assert.equal(formatEmbeddingSearchDocument("치아교정", "통증 안내"), "title: 치아교정 | text: 통증 안내", "Gemini 2 검색 문서 형식이 달라졌습니다.");
assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);

const pediatricLexical = lexical["pediatric-dental-trauma"].slice(0, 3);
const mockSemantic = {
  "pediatric-dental-trauma": pediatricLexical.map((candidate, index) => ({
    topicSpecId: "pediatric-dental-trauma",
    documentId: candidate.documentId,
    evidenceUnitId: candidate.evidenceUnitId,
    title: candidate.title,
    headingPath: [candidate.title],
    path: candidate.path,
    surface: candidate.surface,
    role: candidate.role,
    similarity: 0.9 - index * 0.01,
    excerpt: candidate.excerpt,
  })),
};
const pediatricSpec = COVERAGE_TOPIC_SPECS.filter((spec) => spec.id === "pediatric-dental-trauma");
const initialReview = buildRetrievalReviewItems(pediatricSpec, mockSemantic, lexical);
const labeledReview = initialReview.map((item) => ({ ...item, label: "relevant" as const, notes: "회귀 검증" }));
const regeneratedReview = buildRetrievalReviewItems(pediatricSpec, mockSemantic, lexical, labeledReview);
assert.deepEqual(regeneratedReview.map((item) => item.label), ["relevant", "relevant", "relevant"], "검토 파일 재생성 시 기존 라벨을 보존해야 합니다.");
assert.equal(evaluateRetrievalReview(createRetrievalReviewFile(regeneratedReview, generatedAt), lexical).verdict, "pass", "품질 기준을 충족한 완전 라벨 세트는 통과해야 합니다.");

assert.equal(RETRIEVAL_REVIEW_SEED.items.length, 50, "관리자 검토 후보는 대표 주제별 10개, 총 50개여야 합니다.");
assert.equal(new Set(RETRIEVAL_REVIEW_SEED.items.map((item) => item.id)).size, 50, "관리자 검토 후보 ID가 중복됩니다.");
assert.equal(RETRIEVAL_REVIEW_SEED.items.every((item) => item.label == null && item.reasonTags.length === 0), true, "코드에 저장한 검토 후보에는 사람의 라벨이 포함되면 안 됩니다.");
assert.equal(RETRIEVAL_REVIEW_SEED.items.every((item) => item.headingPath.length > 0 && item.excerpt.trim().length > 0), true, "관리자 검토에 필요한 문맥이 누락되었습니다.");
const retrievalBaseline = retrievalReviewBaselineJson as unknown as RetrievalReviewBaseline;
const reviewedBaseline = applyRetrievalReviewBaseline(RETRIEVAL_REVIEW_SEED, retrievalBaseline);
const reasonSummary = summarizeRetrievalReviewReasons(reviewedBaseline);
assert.equal(reviewedBaseline.items.every((item) => item.label != null), true, "검색 검토 기준선의 50개 후보가 모두 라벨링되어야 합니다.");
assert.equal(reviewedBaseline.items.every((item) => item.notes === item.notes.trim() && !item.notes.startsWith("사전검토:")), true, "기준선 메모에는 상태 접두어나 불필요한 공백이 없어야 합니다.");
assert.deepEqual(
  Object.fromEntries(["relevant", "partial", "irrelevant"].map((label) => [label, reviewedBaseline.items.filter((item) => item.label === label).length])),
  { relevant: 17, partial: 15, irrelevant: 18 },
  "검색 검토 기준선의 라벨 분포가 달라졌습니다.",
);
assert.equal(reasonSummary.overall["adjacent-topic"], 19, "주요 오탐 사유 집계가 달라졌습니다.");
assert.equal(reasonSummary.overall["required-concept"], 17, "핵심 개념 사유 집계가 달라졌습니다.");

const conceptReviewSeed = conceptReviewSeedJson as unknown as ConceptReviewSeed;
assert.equal(conceptReviewSeed.items.length, 28, "개념 검토 후보 수가 달라졌습니다.");
assert.equal(new Set(conceptReviewSeed.items.map((item) => item.id)).size, conceptReviewSeed.items.length, "개념 검토 후보 ID가 중복됩니다.");
assert.equal(conceptReviewSeed.items.every((item) => item.evidenceLevel !== "discovery-only"), true, "탐색 전용 요약문이 개념 검토 seed에 포함되면 안 됩니다.");
assert.equal(conceptReviewSeed.items.filter((item) => item.topicReviewLabel != null).length, 13, "기존 주제 라벨 연결 수가 달라졌습니다.");
assert.equal(conceptReviewSeed.items.reduce((sum, item) => sum + item.conceptIds.length, 0), 61, "개념 판정 항목 수가 달라졌습니다.");
assert.equal(conceptReviewSeed.items.every((item) => item.conceptIds.length > 0
  && item.conceptIds.every((conceptId) => Object.hasOwn(item.conceptLabels, conceptId) && item.conceptLabels[conceptId] == null)), true, "개념 검토 초기 라벨 계약이 올바르지 않습니다.");

console.log(JSON.stringify({
  ok: true,
  engineVersion: CONTENT_COVERAGE_ENGINE_VERSION,
  evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
  evidence: evidence.stats,
  lexicalCandidates: Object.fromEntries(COVERAGE_TOPIC_SPECS.map((spec) => [spec.id, lexical[spec.id].length])),
  topics: COVERAGE_TOPIC_SPECS.map((spec) => ({
    id: spec.id,
    searchTopicKey: spec.searchTopicKey,
    concepts: spec.concepts.length,
    criteria: spec.concepts.reduce((sum, concept) => sum + concept.criteria.length, 0),
    primarySurface: spec.actionPolicy.primarySurface,
    clinicalReview: spec.reviewPolicy.requiresClinicalReview,
  })),
}, null, 2));
