import assert from "node:assert/strict";
import { evaluateOpportunities, getActionEvaluation, OPPORTUNITY_MODEL_VERSION } from "../lib/opportunity-scoring";
import { buildPageUpdateOpportunities } from "../lib/trend-insights";
import { analyzeContentCoverage, type ContentGap } from "../lib/trend-analysis";
import type { BlogBlock, BlogPost } from "../lib/blog/types";

function post(slug: string, title: string, blocks: BlogBlock[] = []): BlogPost {
  return {
    slug,
    category: "implant",
    tags: [],
    title,
    subtitle: "",
    excerpt: "",
    date: "2026-01-01",
    blocks,
  };
}

function gap(overrides: Partial<ContentGap> & Pick<ContentGap, "subGroup" | "monthlyVolume" | "contentGapScore">): ContentGap {
  return {
    category: "implant",
    slug: "implant",
    keywords: [overrides.subGroup],
    trend: "stable",
    changeRate: 0,
    currentAvg: 0,
    existingPostCount: 0,
    directEvidenceCount: 0,
    indirectEvidenceCount: 0,
    contentCoverage: 0,
    coverageEvidence: [],
    volumeSource: overrides.monthlyVolume == null ? "datalab-fallback" : "searchad",
    isEstimated: false,
    relatedKeywords: [],
    directKeywords: [],
    searchIntent: "informational",
    ...overrides,
  };
}

const evaluations = evaluateOpportunities([
  gap({ subGroup: "비용/보험", monthlyVolume: 10_000, contentGapScore: 100, searchIntent: "commercial" }),
  gap({ subGroup: "관리/주의사항", monthlyVolume: 1_000, contentGapScore: 70 }),
  gap({ subGroup: "일반 정보", monthlyVolume: 100, contentGapScore: 10 }),
  gap({ subGroup: "검색량 미수집", monthlyVolume: null, contentGapScore: 100 }),
  gap({ category: "prosthetics", slug: "prosthetics", subGroup: "라미네이트", monthlyVolume: 600, contentGapScore: 60, keywords: ["라미네이트", "라미네이트 비용"] }),
  gap({ category: "general-care", slug: "general-care", subGroup: "발치/사랑니", monthlyVolume: 500, contentGapScore: 80, keywords: ["사랑니 발치", "사랑니 통증"] }),
  gap({ category: "general-care", slug: "general-care", subGroup: "턱관절/이갈이", monthlyVolume: 300, contentGapScore: 70, keywords: ["턱관절 통증", "이갈이"] }),
  gap({ subGroup: "첨단/디지털", monthlyVolume: 400, contentGapScore: 80, keywords: ["디지털 임플란트"] }),
]);

const byKey = new Map(evaluations.map((item) => [item.key, item]));
assert.equal(evaluations.every((item) => item.modelVersion === OPPORTUNITY_MODEL_VERSION), true);
assert.equal(byKey.get("implant:비용/보험")?.demandScore, 100, "최고 검색 수요는 전체·카테고리 백분위 100이어야 합니다.");
assert.equal(byKey.get("implant:일반 정보")?.demandScore, 0, "최저 검색 수요는 백분위 0이어야 합니다.");
assert.equal(byKey.get("implant:검색량 미수집")?.demandScore, null, "검색량 부재를 0으로 바꾸면 안 됩니다.");
assert.equal(byKey.get("implant:검색량 미수집")?.confidence, "C");
assert.equal(getActionEvaluation(byKey.get("implant:검색량 미수집")!, "blog")?.eligibility, "needs-data");
assert.equal(getActionEvaluation(byKey.get("implant:일반 정보")!, "blog")?.eligibility, "covered");
assert.equal(getActionEvaluation(byKey.get("implant:비용/보험")!, "blog")?.eligibility, "eligible");
assert.equal((getActionEvaluation(byKey.get("implant:비용/보험")!, "blog")?.valueScore ?? 0) > (getActionEvaluation(byKey.get("implant:관리/주의사항")!, "blog")?.valueScore ?? 0), true);
assert.equal(getActionEvaluation(byKey.get("general-care:발치/사랑니")!, "page")?.eligibility, "not-applicable", "환자 교육 주제를 페이지 보강으로 추천하면 안 됩니다.");
assert.equal(getActionEvaluation(byKey.get("general-care:발치/사랑니")!, "faq")?.eligibility, "eligible", "환자 교육 주제는 페이지가 없어도 전체 FAQ 커버리지를 기준으로 FAQ 후보가 될 수 있어야 합니다.");
assert.equal(byKey.get("general-care:발치/사랑니")?.demandScore, 50, "4개 미만 카테고리는 내부 백분위를 섞지 않아야 합니다.");
assert.equal(getActionEvaluation(byKey.get("prosthetics:라미네이트")!, "faq")?.eligibility, "eligible", "본문에서 다루고 FAQ가 없는 주제는 FAQ 후보여야 합니다.");

const sameContext = analyzeContentCoverage([
  post("same-context", "임플란트 안내", [{ type: "paragraph", text: "임플란트 치료를 결정할 때 전체 비용을 확인합니다." }]),
], ["임플란트 비용"], "비용/가격");
assert.ok(sameContext.contentGapScore < 100, "같은 문맥의 핵심 토큰을 연속 문자열이 아니라는 이유로 놓치면 안 됩니다.");

const splitContext = analyzeContentCoverage([
  post("split-context", "치과 안내", [
    { type: "paragraph", text: "임플란트 치료를 설명합니다." },
    { type: "paragraph", text: "별도의 일반 비용 안내입니다." },
  ]),
], ["임플란트 비용"], "비용/가격");
assert.equal(splitContext.contentGapScore, 100, "서로 다른 문단에 흩어진 토큰을 하나의 주제 근거로 합치면 안 됩니다.");

const incidentalCoverage = analyzeContentCoverage([
  {
    ...post("incidental", "실란트, 꼭 해야 하나요?", [
      { type: "paragraph", text: "실란트는 치과 치료를 시작할 때 전체 비용도 함께 확인합니다." },
    ]),
    subtitle: "건강보험 여부에 따라 치과 진료 비용이 달라질 수 있습니다.",
  },
], ["치과 비용"], "비용/보험");
assert.ok(incidentalCoverage.contentGapScore >= 70, "다른 치료 글의 간접 비용 언급이 비용/보험 주제를 크게 충족하면 안 됩니다.");
assert.ok(incidentalCoverage.evidence[0]?.reasons.includes("간접 언급 상한 적용"), "간접 언급 제한은 관리자 근거에 표시해야 합니다.");
assert.equal(incidentalCoverage.directEvidenceCount, 0, "간접 비용 언급을 직접 근거로 집계하면 안 됩니다.");
assert.equal(incidentalCoverage.indirectEvidenceCount, 1, "간접 비용 언급 수를 별도로 집계해야 합니다.");

const dedicatedCoverage = analyzeContentCoverage([
  post("dedicated-cost", "치과 비용 안내", [
    { type: "heading", level: 2, text: "치과 비용과 건강보험 적용" },
    { type: "paragraph", text: "치과 비용은 치료 종류와 건강보험 적용 여부에 따라 달라집니다." },
  ]),
], ["치과 비용"], "비용/보험");
assert.ok(dedicatedCoverage.contentGapScore < incidentalCoverage.contentGapScore, "전용 콘텐츠는 간접 언급보다 커버리지 기여가 커야 합니다.");
assert.equal(dedicatedCoverage.directEvidenceCount, 1, "전용 콘텐츠는 직접 근거로 집계해야 합니다.");

const mixedEvidence = analyzeContentCoverage([
  ...incidentalCoverage.evidence.map((item) => post(item.slug, item.title, [
    { type: "paragraph", text: "실란트는 치과 치료를 시작할 때 전체 비용도 함께 확인합니다." },
  ])),
  post("direct-cost", "치과 비용 안내"),
], ["치과 비용"], "비용/보험");
assert.equal(mixedEvidence.evidence[0]?.matchType, "direct", "직접 근거는 점수가 같거나 낮아도 간접 언급보다 먼저 표시해야 합니다.");

const shallowCoverage = analyzeContentCoverage([
  post("shallow", "임플란트 비용 안내"),
], ["임플란트 비용"], "비용/가격");
const deepCoverage = analyzeContentCoverage([
  post("deep", "임플란트 비용 안내", [
    { type: "heading", level: 2, text: "임플란트 비용을 결정하는 요소" },
    { type: "paragraph", text: "임플란트 비용은 뼈와 보철 상태에 따라 달라집니다." },
    { type: "paragraph", text: "임플란트 비용과 보험 적용 범위를 함께 확인합니다." },
    { type: "faq", question: "임플란트 비용은 얼마인가요?", answer: "검진 후 비용 범위를 안내합니다." },
  ]),
], ["임플란트 비용"], "비용/가격");
assert.ok(deepCoverage.contentGapScore < shallowCoverage.contentGapScore, "제목만 언급한 글보다 본문과 FAQ가 충실한 글의 공백이 작아야 합니다.");

const primary = post("primary", "임플란트 비용 안내", [{ type: "paragraph", text: "임플란트 비용과 보험을 설명합니다." }]);
const duplicate = post("duplicate", "임플란트 가격 안내", [{ type: "paragraph", text: "임플란트 가격과 비용을 설명합니다." }]);
const novel = post("novel", "임플란트 관리 안내", [{ type: "paragraph", text: "임플란트 관리와 양치 방법을 설명합니다." }]);
const duplicateCoverage = analyzeContentCoverage([primary, duplicate], ["임플란트 비용", "임플란트 관리"], "비용/관리");
const novelCoverage = analyzeContentCoverage([primary, novel], ["임플란트 비용", "임플란트 관리"], "비용/관리");
assert.ok(novelCoverage.contentGapScore < duplicateCoverage.contentGapScore, "중복 글보다 새로운 개념을 보완하는 글의 추가 기여가 커야 합니다.");

const noCoverage = analyzeContentCoverage([
  post("unrelated", "올바른 칫솔 선택법"),
], ["임플란트 비용"], "비용/가격");
assert.equal(noCoverage.contentGapScore, 100, "관련 콘텐츠가 없으면 공백은 100이어야 합니다.");

const thresholdEvaluations = evaluateOpportunities([
  gap({ subGroup: "경계-충족", monthlyVolume: 100, contentGapScore: 24 }),
  gap({ subGroup: "경계-후보", monthlyVolume: 100, contentGapScore: 25 }),
]);
assert.equal(getActionEvaluation(thresholdEvaluations[0], "blog")?.eligibility, "covered", "공백 24는 충족 상태여야 합니다.");
assert.equal(getActionEvaluation(thresholdEvaluations[1], "blog")?.eligibility, "eligible", "공백 25는 신규 글 후보여야 합니다.");

const pagePlans = buildPageUpdateOpportunities([], evaluations);
assert.equal(new Set(pagePlans.map((item) => item.targetPage)).size, pagePlans.length, "대상 페이지마다 실행 계획은 하나만 생성되어야 합니다.");
const implantPlan = pagePlans.find((item) => item.targetPage === "/treatments/implant");
assert.ok(implantPlan, "임플란트 페이지 통합 보강 계획이 생성되어야 합니다.");
assert.equal(implantPlan.contributingTopics.some((item) => item.topicKey === "implant:첨단/디지털"), false, "확인 필요 주제를 점수에 합산하면 안 됩니다.");
assert.equal(implantPlan.confirmationTopics.some((item) => item.topicKey === "implant:첨단/디지털"), true, "확인 필요 주제는 별도 근거로 남아야 합니다.");

const [gumRegeneration] = evaluateOpportunities([
  gap({ category: "general-care", slug: "general-care", subGroup: "잇몸재생", monthlyVolume: 200, contentGapScore: 80, keywords: ["잇몸재생술", "잇몸 퇴축 치료"] }),
]);
assert.equal(getActionEvaluation(gumRegeneration, "page")?.eligibility, "not-applicable", "잇몸재생을 진료 페이지 보강으로 추천하면 안 됩니다.");
assert.notEqual(getActionEvaluation(gumRegeneration, "faq")?.eligibility, "not-applicable", "잇몸재생은 전체 FAQ 기준 평가 대상이어야 합니다.");
const educationFaq = byKey.get("general-care:발치/사랑니")!;
assert.equal(getActionEvaluation(educationFaq, "faq")?.valueScore, Math.round(
  educationFaq.questionSignal * 0.25
  + educationFaq.faqGapScore! * 0.25
  + educationFaq.demandScore! * 0.15
  + educationFaq.patientBusinessValue * 0.2
  + educationFaq.strategicFit * 0.15
), "FAQ 점수에 전략 적합성이 반영되어야 합니다.");

const [brandSearch] = evaluateOpportunities([
  gap({ category: "dental-choice", slug: "dental-choice", subGroup: "브랜드검색", monthlyVolume: 2_000, contentGapScore: 100, keywords: ["서울본치과"] }),
]);
assert.equal(getActionEvaluation(brandSearch, "blog")?.eligibility, "not-applicable", "브랜드 탐색 의도를 신규 블로그 후보로 추천하면 안 됩니다.");
assert.equal(getActionEvaluation(brandSearch, "blog")?.valueScore, null);

const [symptomGuidance] = evaluateOpportunities([
  gap({ category: "health-tips", slug: "health-tips", subGroup: "증상/내원판단", monthlyVolume: 1_000, contentGapScore: 80, keywords: ["치통", "이가 흔들려요"] }),
]);
assert.equal(getActionEvaluation(symptomGuidance, "page")?.eligibility, "not-applicable", "증상 안내를 단일 진료 페이지 보강으로 추천하면 안 됩니다.");
assert.notEqual(getActionEvaluation(symptomGuidance, "faq")?.eligibility, "not-applicable", "증상 안내는 전체 FAQ 기준 평가 대상이어야 합니다.");
const contributingScores = implantPlan.contributingTopics.map((item) => item.valueScore).sort((a, b) => b - a);
const nextScores = contributingScores.slice(1, 3);
const nextAverage = nextScores.length ? nextScores.reduce((sum, score) => sum + score, 0) / nextScores.length : contributingScores[0];
assert.equal(implantPlan.pageValueScore, Math.round(contributingScores[0] * 0.7 + nextAverage * 0.3), "페이지 통합 점수 공식이 달라졌습니다.");

for (const evaluation of evaluations) {
  for (const action of evaluation.actions) {
    if (action.valueScore == null) continue;
    assert.equal(action.valueScore >= 0 && action.valueScore <= 100, true, `${evaluation.key}/${action.actionType} 점수 범위 오류`);
  }
}

console.log(JSON.stringify({
  ok: true,
  modelVersion: OPPORTUNITY_MODEL_VERSION,
  cases: evaluations.map((item) => ({
    key: item.key,
    confidence: item.confidence,
    demandScore: item.demandScore,
    contentGapScore: item.contentGapScore,
    actions: item.actions,
  })),
  pagePlans,
}, null, 2));
