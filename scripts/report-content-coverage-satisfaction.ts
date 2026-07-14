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
  const report = assessConceptSatisfaction(
    COVERAGE_TOPIC_SPECS,
    reviewed,
    conceptSearchResolutionJson as ConceptSearchResolution,
  );
  const outputPath = path.resolve(process.cwd(), ".tmp/content-coverage-satisfaction.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    output: outputPath,
    schemaVersion: report.schemaVersion,
    retrievalVersion: report.retrievalVersion,
    concepts: report.results.length,
    summary: {
      finalStatuses: Object.fromEntries(["covered", "partial", "missing", "needs-review", "not-evaluated"].map((status) => [
        status,
        report.results.filter((result) => result.status === status).length,
      ])),
      provisionalStatuses: Object.fromEntries(["covered", "partial", "missing", "not-evaluated"].map((status) => [
        status,
        report.results.filter((result) => result.provisionalStatus === status).length,
      ])),
    },
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
