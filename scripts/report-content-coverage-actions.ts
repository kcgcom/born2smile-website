import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildActionRecommendations } from "../lib/content-coverage/action-recommendation";
import { applyConceptReviewBaseline, type ConceptReviewBaseline, type ConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { assessConceptSatisfaction, type ConceptSearchResolution } from "../lib/content-coverage/concept-satisfaction";
import conceptReviewBaselineJson from "../lib/content-coverage/generated/concept-review-baseline.json";
import conceptReviewSeedJson from "../lib/content-coverage/generated/concept-review-seed.json";
import conceptSearchResolutionJson from "../lib/content-coverage/generated/concept-search-resolution.json";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";

async function main() {
  const reviewed = applyConceptReviewBaseline(
    conceptReviewSeedJson as unknown as ConceptReviewSeed,
    conceptReviewBaselineJson as unknown as ConceptReviewBaseline,
  );
  const satisfaction = assessConceptSatisfaction(
    COVERAGE_TOPIC_SPECS,
    reviewed,
    conceptSearchResolutionJson as ConceptSearchResolution,
  );
  const report = buildActionRecommendations(COVERAGE_TOPIC_SPECS, satisfaction);
  const outputPath = path.resolve(process.cwd(), ".tmp/content-coverage-actions.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: outputPath,
    schemaVersion: report.schemaVersion,
    recommendations: report.recommendations.length,
    byAction: Object.fromEntries([...new Set(report.recommendations.map((item) => item.actionType))].map((actionType) => [
      actionType,
      report.recommendations.filter((item) => item.actionType === actionType).length,
    ])),
    blocked: report.recommendations.filter((item) => item.blockedBy.length > 0).length,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
