import fs from "node:fs";
import path from "node:path";

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
  const [{ getTrendOverviewBaseData }, { getAllPublishedPostsUncached }, { analyzeContentGap }, { evaluateOpportunities }, { buildPageUpdateOpportunities }] = await Promise.all([
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
  console.log(JSON.stringify({
    topics: evaluations.length,
    posts: posts.length,
    contentGapDistribution: Object.fromEntries(
      [...new Set(gaps.map((gap) => gap.contentGapScore))]
        .sort((a, b) => a - b)
        .map((score) => [score, gaps.filter((gap) => gap.contentGapScore === score).length]),
    ),
    contentGapAudit: gaps.map((gap) => ({
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
