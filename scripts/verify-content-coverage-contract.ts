import assert from "node:assert/strict";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import conceptReviewSeedJson from "../lib/content-coverage/generated/concept-review-seed.json";
import conceptReviewBaselineJson from "../lib/content-coverage/generated/concept-review-baseline.json";
import conceptSearchResolutionJson from "../lib/content-coverage/generated/concept-search-resolution.json";
import retrievalReviewBaselineJson from "../lib/content-coverage/generated/retrieval-review-baseline.json";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import { applyRetrievalReviewBaseline, buildRetrievalReviewItems, createRetrievalReviewFile, evaluateRetrievalReview, summarizeRetrievalReviewReasons, type RetrievalReviewBaseline } from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS, validateCoverageTopicSpecs } from "../lib/content-coverage/topic-specs";
import { CONTENT_COVERAGE_ENGINE_VERSION, EVIDENCE_SCHEMA_VERSION } from "../lib/content-coverage/types";
import { applyConceptReviewBaseline, evaluateConceptReview, type ConceptReviewBaseline, type ConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { assessConceptSatisfaction, type ConceptSearchResolution } from "../lib/content-coverage/concept-satisfaction";
import { buildActionRecommendations } from "../lib/content-coverage/action-recommendation";
import { buildOperationalConceptReviewSnapshot } from "../lib/content-coverage/concept-review-store";
import { calculateTargetEvidenceRevision } from "../lib/content-coverage/operational-evidence";
import { buildContentReevaluationState } from "../lib/content-coverage/reevaluation-store";
import type { ContentPlannerItem } from "../lib/content-planner";
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
const orthodonticsRevision = calculateTargetEvidenceRevision(evidence, "/treatments/orthodontics");
assert.equal(typeof orthodonticsRevision, "string", "대상 페이지의 근거 리비전을 계산해야 합니다.");
assert.equal(typeof calculateTargetEvidenceRevision(evidence, "/blog/prevention"), "string", "블로그 카테고리 경로는 하위 게시글 근거를 포함해야 합니다.");
assert.equal(calculateTargetEvidenceRevision(evidence, "/not-found"), null, "근거가 없는 경로에 리비전을 만들면 안 됩니다.");
const coveragePlannerItem: ContentPlannerItem = {
  id: "planner-contract",
  opportunityKey: "action-recommendation-v1:orthodontics-pain-risks:update-treatment-page",
  itemType: "page",
  title: "교정 페이지 보강",
  category: "교정",
  targetPage: "/treatments/orthodontics",
  status: "published",
  priority: "now",
  rationale: "계약 검증",
  brief: {},
  sourceSnapshot: {
    schemaVersion: "action-recommendation-v1",
    actionKey: "action-recommendation-v1:orthodontics-pain-risks:update-treatment-page",
    topicSpecId: "orthodontics-pain-risks",
    assessmentInputVersion: "concept-review-input-contract",
    targetEvidenceRevision: orthodonticsRevision,
  },
  dueDate: null,
  createdBy: "contract@example.com",
  createdAt: generatedAt,
  updatedAt: generatedAt,
};
assert.equal(buildContentReevaluationState(coveragePlannerItem, orthodonticsRevision, "contract@example.com", generatedAt).status,
  "awaiting-content-change", "콘텐츠 리비전이 같으면 재평가를 시작하면 안 됩니다.");
assert.equal(buildContentReevaluationState(coveragePlannerItem, "changed-revision", "contract@example.com", generatedAt).status,
  "pending-evidence-refresh", "콘텐츠 리비전이 바뀌면 근거 재평가를 요청해야 합니다.");

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
assert.equal(conceptReviewSeed.items.length, 30, "개념 검토 후보 수가 달라졌습니다.");
assert.equal(new Set(conceptReviewSeed.items.map((item) => item.id)).size, conceptReviewSeed.items.length, "개념 검토 후보 ID가 중복됩니다.");
assert.equal(conceptReviewSeed.items.every((item) => item.evidenceLevel !== "discovery-only"), true, "탐색 전용 요약문이 개념 검토 seed에 포함되면 안 됩니다.");
assert.equal(conceptReviewSeed.items.filter((item) => item.topicReviewLabel != null).length, 14, "기존 주제 라벨 연결 수가 달라졌습니다.");
assert.equal(conceptReviewSeed.items.reduce((sum, item) => sum + item.conceptIds.length, 0), 64, "개념 판정 항목 수가 달라졌습니다.");
assert.equal(conceptReviewSeed.items.every((item) => item.conceptIds.length > 0
  && item.conceptIds.every((conceptId) => Object.hasOwn(item.conceptLabels, conceptId)
    && item.conceptLabels[conceptId] == null
    && Object.hasOwn(item.conceptRetrieval, conceptId))), true, "개념 검토 초기 라벨 계약이 올바르지 않습니다.");
assert.equal(conceptReviewSeed.items.every((item) => Object.values(item.conceptRetrieval).every((retrieval) =>
  retrieval.rank == null || (retrieval.rank >= 1 && retrieval.rank <= 5 && retrieval.evidenceLevel != null && retrieval.rerankScore != null))), true, "개념별 검색 순위 계약이 올바르지 않습니다.");
const reviewedConcepts = applyConceptReviewBaseline(
  conceptReviewSeed,
  conceptReviewBaselineJson as unknown as ConceptReviewBaseline,
);
const initialOperationalReview = buildOperationalConceptReviewSnapshot({});
assert.equal(initialOperationalReview.review.items.every((item) => item.topicReviewLabel != null
  && item.conceptIds.every((conceptId) => item.conceptLabels[conceptId] != null)), true, "운영 개념 검토는 검토 기준선으로 초기화되어야 합니다.");
assert.equal(initialOperationalReview.input.source, "reviewed-baseline");
const firstBaselineItem = (conceptReviewBaselineJson as unknown as ConceptReviewBaseline).items[0];
const overriddenOperationalReview = buildOperationalConceptReviewSnapshot({
  [firstBaselineItem.id]: {
    topicReviewLabel: firstBaselineItem.topicReviewLabel,
    conceptLabels: firstBaselineItem.conceptLabels,
    notes: "관리자 운영 판정",
    updatedAt: "2026-07-14T12:00:00.000Z",
    updatedBy: "contract@example.com",
  },
});
assert.equal(overriddenOperationalReview.input.source, "baseline-with-admin-overrides");
assert.equal(overriddenOperationalReview.input.adminOverrideCount, 1);
assert.equal(overriddenOperationalReview.input.latestAdminReviewAt, "2026-07-14T12:00:00.000Z");
assert.equal(overriddenOperationalReview.input.version, initialOperationalReview.input.version, "판정 내용이 같으면 운영 입력 버전이 바뀌면 안 됩니다.");
const firstConceptId = Object.keys(firstBaselineItem.conceptLabels)[0];
const changedOperationalReview = buildOperationalConceptReviewSnapshot({
  [firstBaselineItem.id]: {
    topicReviewLabel: firstBaselineItem.topicReviewLabel,
    conceptLabels: {
      ...firstBaselineItem.conceptLabels,
      [firstConceptId]: firstBaselineItem.conceptLabels[firstConceptId] === "supports" ? "partial" : "supports",
    },
    notes: "관리자 운영 판정 변경",
    updatedAt: "2026-07-14T12:05:00.000Z",
    updatedBy: "contract@example.com",
  },
});
assert.notEqual(changedOperationalReview.input.version, initialOperationalReview.input.version, "판정 내용이 바뀌면 운영 입력 버전도 바뀌어야 합니다.");
const completedReevaluation = {
  ...buildContentReevaluationState(coveragePlannerItem, "changed-revision", "contract@example.com", generatedAt),
  status: "completed" as const,
  candidateSet: {
    ...reviewedConcepts,
    generatedAt: "2026-07-15T00:00:00.000Z",
    items: reviewedConcepts.items.filter((item) => item.topicSpecId === "orthodontics-pain-risks"),
  },
  completedAt: "2026-07-15T00:10:00.000Z",
  completedBy: "contract@example.com",
};
const reevaluatedOperationalReview = buildOperationalConceptReviewSnapshot({}, [completedReevaluation]);
assert.equal(reevaluatedOperationalReview.input.source, "baseline-with-reevaluation");
assert.equal(reevaluatedOperationalReview.input.completedReevaluationCount, 1);
assert.notEqual(reevaluatedOperationalReview.input.version, initialOperationalReview.input.version, "재평가 완료 시 운영 입력 버전을 갱신해야 합니다.");
assert.equal(reevaluatedOperationalReview.review.items.filter((item) => item.topicSpecId === "orthodontics-pain-risks").length,
  completedReevaluation.candidateSet.items.length, "완료한 재평가 후보가 해당 주제의 운영 후보를 교체해야 합니다.");
const conceptEvaluation = evaluateConceptReview(COVERAGE_TOPIC_SPECS, reviewedConcepts);
assert.equal(conceptEvaluation.conceptJudgments, 64, "개념 기준선 판정 수가 달라졌습니다.");
assert.deepEqual(
  Object.fromEntries(["supports", "partial", "not-supported"].map((label) => [label, reviewedConcepts.items.reduce(
    (sum, item) => sum + Object.values(item.conceptLabels).filter((value) => value === label).length,
    0,
  )])),
  { supports: 38, partial: 25, "not-supported": 1 },
  "개념 기준선 라벨 분포가 달라졌습니다.",
);
assert.equal(conceptEvaluation.verdict, "fail", "필수 개념이 비어 있는 현재 shadow 검색은 승격되면 안 됩니다.");
assert.deepEqual(
  Object.fromEntries(conceptEvaluation.topics.map((topic) => [topic.topicSpecId, topic.missingRequiredConceptIds])),
  {
    "orthodontics-pain-risks": ["root-resorption"],
    "dental-cost-insurance": ["private-insurance"],
    "front-teeth-treatment": [],
    "pediatric-dental-trauma": [],
    "oral-hygiene": [],
  },
  "검색되지 않은 필수 개념 목록이 달라졌습니다.",
);
const conceptSatisfaction = assessConceptSatisfaction(
  COVERAGE_TOPIC_SPECS,
  reviewedConcepts,
  conceptSearchResolutionJson as ConceptSearchResolution,
);
assert.equal(conceptSatisfaction.results.length, 24, "개념 충족 판정 수가 달라졌습니다.");
assert.deepEqual(
  Object.fromEntries(["covered", "partial", "missing", "not-evaluated"].map((status) => [
    status,
    conceptSatisfaction.results.filter((result) => result.provisionalStatus === status).length,
  ])),
  { covered: 16, partial: 6, missing: 2, "not-evaluated": 0 },
  "잠정 개념 충족 상태가 달라졌습니다.",
);
assert.deepEqual(
  Object.fromEntries(["covered", "partial", "missing", "needs-review", "not-evaluated"].map((status) => [
    status,
    conceptSatisfaction.results.filter((result) => result.status === status).length,
  ])),
  { covered: 8, partial: 0, missing: 1, "needs-review": 15, "not-evaluated": 0 },
  "최종 개념 충족 상태가 달라졌습니다.",
);
assert.equal(conceptSatisfaction.results.every((result) => result.coverageScore == null
  && result.criteria.every((criterion) => criterion.status === "not-evaluated")), true, "기준별 라벨 없이 점수나 기준 충족을 계산하면 안 됩니다.");
const unresolvedSatisfaction = assessConceptSatisfaction(COVERAGE_TOPIC_SPECS, reviewedConcepts, {
  schemaVersion: "concept-search-resolution-v1",
  retrievalVersion: reviewedConcepts.retrievalVersion,
  reviewedAt: conceptSearchResolutionJson.reviewedAt,
  items: [],
});
assert.equal(unresolvedSatisfaction.results.find((result) => result.conceptId === "root-resorption")?.provisionalStatus, "not-evaluated", "fallback 확인 없이 미검색 개념을 missing으로 확정하면 안 됩니다.");
const actionRecommendations = buildActionRecommendations(COVERAGE_TOPIC_SPECS, conceptSatisfaction);
assert.equal(actionRecommendations.recommendations.length, 8, "행동추천 수가 달라졌습니다.");
assert.equal(actionRecommendations.assessmentInput.source, "static-evaluation", "계약 검증 추천은 고정 평가 입력을 사용해야 합니다.");
assert.equal(actionRecommendations.assessmentInput.version.includes(conceptSatisfaction.retrievalVersion), true, "행동추천에 판정 입력 버전이 보존되어야 합니다.");
assert.deepEqual(
  Object.fromEntries(["clinical-review", "update-treatment-page", "add-faq", "no-action"].map((actionType) => [
    actionType,
    actionRecommendations.recommendations.filter((recommendation) => recommendation.actionType === actionType).length,
  ])),
  { "clinical-review": 3, "update-treatment-page": 2, "add-faq": 2, "no-action": 1 },
  "행동추천 유형 분포가 달라졌습니다.",
);
assert.equal(new Set(actionRecommendations.recommendations.map((recommendation) => recommendation.actionKey)).size, actionRecommendations.recommendations.length, "행동추천 키가 중복됩니다.");
assert.equal(actionRecommendations.recommendations.every((recommendation) => recommendation.valueScore == null), true, "수요 입력 없이 행동 가치 점수를 만들면 안 됩니다.");
assert.equal(actionRecommendations.recommendations.filter((recommendation) => recommendation.actionType === "update-treatment-page"
  || (recommendation.actionType === "add-faq" && recommendation.topicSpecId === "pediatric-dental-trauma")).every((recommendation) =>
  recommendation.blockedBy.some((blocker) => blocker.type === "must-complete-before")), true, "임상 콘텐츠 수정은 의료진 검토에 막혀야 합니다.");
assert.equal(actionRecommendations.recommendations.find((recommendation) => recommendation.topicSpecId === "dental-cost-insurance")?.blockedBy.length, 0, "민간보험 FAQ는 임상 검토에 막히면 안 됩니다.");
const reevaluatedSatisfaction = assessConceptSatisfaction(
  COVERAGE_TOPIC_SPECS,
  reevaluatedOperationalReview.review,
  conceptSearchResolutionJson as ConceptSearchResolution,
);
const reevaluatedActions = buildActionRecommendations(COVERAGE_TOPIC_SPECS, reevaluatedSatisfaction, {
  ...reevaluatedOperationalReview.input,
  baselineReviewedAt: conceptSearchResolutionJson.reviewedAt,
});
assert.equal(reevaluatedActions.recommendations.some((recommendation) => recommendation.topicSpecId === "orthodontics-pain-risks"
  && recommendation.actionType === "update-treatment-page" && recommendation.actionKey.includes(reevaluatedOperationalReview.input.topicReevaluationVersions["orthodontics-pain-risks"])),
true, "재평가 후에도 공백이 남으면 새 반복 작업 키를 만들어야 합니다.");
const unresolvedActions = buildActionRecommendations(COVERAGE_TOPIC_SPECS, unresolvedSatisfaction);
assert.equal(unresolvedActions.recommendations.some((recommendation) => recommendation.actionType === "evidence-review"
  && recommendation.topicSpecId === "dental-cost-insurance"), true, "미평가 개념은 콘텐츠 작성 대신 근거 재검토를 추천해야 합니다.");
assert.equal(unresolvedActions.recommendations.some((recommendation) => recommendation.actionType === "add-faq"
  && recommendation.topicSpecId === "dental-cost-insurance"), false, "미평가 개념을 콘텐츠 공백으로 간주하면 안 됩니다.");

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
