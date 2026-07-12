import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const [{ getTrendOverviewBaseData }, { getAllPublishedPostsUncached }, { analyzeContentGap, isContentGapApplicable }, { evaluateOpportunities }, { buildPageUpdateOpportunities }] = await Promise.all([
    import("../app/api/admin/naver-datalab/_lib/overview"),
    import("../lib/blog-supabase"),
    import("../lib/trend-analysis"),
    import("../lib/opportunity-scoring"),
    import("../lib/trend-insights"),
  ]);
  const [base, posts] = await Promise.all([
    getTrendOverviewBaseData("3m", "strategy", false, "short"),
    getAllPublishedPostsUncached(),
  ]);
  const gaps = analyzeContentGap(base.successfulCategoryData, posts, base.keywordTaxonomy, base.volumeData);
  const evaluatedGaps = gaps.filter((gap) => isContentGapApplicable(gap.category, gap.subGroup));
  const evaluations = evaluateOpportunities(gaps);
  const pagePlans = buildPageUpdateOpportunities(gaps, evaluations);
  const actions = evaluations.flatMap((evaluation) => evaluation.actions
    .filter((action) => action.eligibility === "eligible" && action.valueScore != null)
    .map((action) => ({
      key: evaluation.key,
      type: action.actionType,
      score: action.valueScore,
      confidence: evaluation.confidence,
      demand: evaluation.demandScore,
      contentGap: evaluation.contentGapScore,
    })))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const distinctGapScores = new Set(evaluatedGaps.map((gap) => gap.contentGapScore)).size;
  const extremeGapRatio = evaluatedGaps.filter((gap) => gap.contentGapScore === 0 || gap.contentGapScore === 100).length / Math.max(1, evaluatedGaps.length);
  const highWithoutEvidence = evaluatedGaps.filter((gap) => gap.contentGapScore >= 55 && gap.existingPostCount > 0 && gap.coverageEvidence.length === 0);
  const blogCandidateCount = actions.filter((action) => action.type === "blog").length;
  assert.ok(distinctGapScores >= 10, `콘텐츠 공백 점수가 ${distinctGapScores}개 값에 몰렸습니다.`);
  assert.ok(extremeGapRatio <= 0.4, `콘텐츠 공백 극단값 비율이 ${Math.round(extremeGapRatio * 100)}%입니다.`);
  assert.equal(highWithoutEvidence.length, 0, "근거 게시글 수와 근거 목록이 일치하지 않는 큰 공백이 있습니다.");
  assert.ok(blogCandidateCount <= evaluatedGaps.length * 0.8, `신규 글 후보가 ${blogCandidateCount}개로 비정상적으로 많습니다.`);
  console.log(JSON.stringify({
    topics: evaluations.length,
    posts: posts.length,
    qualityChecks: {
      distinctGapScores,
      extremeGapRatio: Math.round(extremeGapRatio * 1000) / 1000,
      highWithoutEvidence: highWithoutEvidence.length,
      blogCandidateRatio: Math.round(blogCandidateCount / Math.max(1, evaluatedGaps.length) * 1000) / 1000,
      excludedTopics: gaps.length - evaluatedGaps.length,
    },
    contentGapDistribution: Object.fromEntries(
      [...new Set(evaluatedGaps.map((gap) => gap.contentGapScore))]
        .sort((a, b) => a - b)
        .map((score) => [score, evaluatedGaps.filter((gap) => gap.contentGapScore === score).length]),
    ),
    contentGapAudit: evaluatedGaps.map((gap) => ({
      key: `${gap.category}:${gap.subGroup}`,
      score: gap.contentGapScore,
      coverage: gap.contentCoverage,
      monthlyVolume: gap.monthlyVolume,
      matchedPosts: gap.existingPostCount,
      evidence: gap.coverageEvidence,
    })),
    eligible: actions.length,
    byType: Object.fromEntries((["blog", "page", "faq"] as const).map((type) => [type, actions.filter((action) => action.type === type).length])),
    pagePlanCount: pagePlans.length,
    pagePlans: pagePlans.map((plan) => ({
      targetPage: plan.targetPage,
      score: plan.pageValueScore,
      contributingTopics: plan.contributingTopics.map((topic) => `${topic.subGroup} (${topic.valueScore}, ${topic.status})`),
      confirmationTopics: plan.confirmationTopics.map((topic) => topic.subGroup),
    })),
    needsData: evaluations.filter((evaluation) => evaluation.confidence === "C").length,
    top: actions.slice(0, 30),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
