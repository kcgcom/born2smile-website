import assert from "node:assert/strict";
import { evaluateOpportunities, getActionEvaluation, OPPORTUNITY_MODEL_VERSION } from "../lib/opportunity-scoring";
import { buildPageUpdateOpportunities } from "../lib/trend-insights";
import type { ContentGap } from "../lib/trend-analysis";

function gap(overrides: Partial<ContentGap> & Pick<ContentGap, "subGroup" | "monthlyVolume" | "contentGapScore">): ContentGap {
  return {
    category: "implant",
    slug: "implant",
    keywords: [overrides.subGroup],
    trend: "stable",
    changeRate: 0,
    currentAvg: 0,
    existingPostCount: 0,
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
