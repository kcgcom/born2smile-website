import fs from "node:fs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildConceptShadowRetrieval } from "../lib/content-coverage/concept-shadow-retrieval";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import retrievalReviewBaselineJson from "../lib/content-coverage/generated/retrieval-review-baseline.json";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { applyRetrievalReviewBaseline, type RetrievalReviewBaseline } from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/content-coverage-concept-shadow.json");

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

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 1000;
}

async function main() {
  const baseline = applyRetrievalReviewBaseline(
    RETRIEVAL_REVIEW_SEED,
    retrievalReviewBaselineJson as unknown as RetrievalReviewBaseline,
  );
  const baselineLabels = new Map(baseline.items.map((item) => [`${item.topicSpecId}:${item.evidenceUnitId}`, item.label]));
  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const shadow = await buildConceptShadowRetrieval(COVERAGE_TOPIC_SPECS, snapshot.documents);

  const comparisons = Object.fromEntries(COVERAGE_TOPIC_SPECS.map((spec) => {
    const topic = shadow.topics[spec.id];
    const candidates = topic.integrated.map((candidate, index) => ({
      rank: index + 1,
      ...candidate,
      baselineLabel: baselineLabels.get(`${spec.id}:${candidate.evidenceUnitId}`) ?? null,
    }));
    const known = candidates.filter((candidate) => candidate.baselineLabel != null);
    const top3 = candidates.slice(0, 3);
    const knownTop3 = top3.filter((candidate) => candidate.baselineLabel != null);
    const usableTop3 = knownTop3.filter((candidate) => candidate.baselineLabel === "relevant" || candidate.baselineLabel === "partial");
    const baselineTopicIds = new Set(baseline.items.filter((item) => item.topicSpecId === spec.id).map((item) => item.evidenceUnitId));
    const requiredConcepts = spec.concepts.filter((concept) => concept.importance === "required");
    const hasUsableConceptCandidate = (conceptId: string) => topic.byConcept[conceptId].some((candidate) => candidate.evidenceLevel !== "discovery-only");
    const conceptsWithCandidates = spec.concepts.filter((concept) => hasUsableConceptCandidate(concept.id));
    return [spec.id, {
      knownCandidates: known.length,
      newReviewCount: candidates.length - known.length,
      retainedBaselineCandidates: candidates.filter((candidate) => baselineTopicIds.has(candidate.evidenceUnitId)).length,
      knownUsablePrecisionAt3: ratio(usableTop3.length, knownTop3.length),
      unknownAt3: top3.length - knownTop3.length,
      knownIrrelevantRateAt10: ratio(known.filter((candidate) => candidate.baselineLabel === "irrelevant").length, known.length),
      exclusionLeakageCount: candidates.filter((candidate) => candidate.exclusionMatches.length > 0).length,
      conceptCandidateCoverage: ratio(conceptsWithCandidates.length, spec.concepts.length),
      requiredConceptCandidateCoverage: ratio(
        requiredConcepts.filter((concept) => hasUsableConceptCandidate(concept.id)).length,
        requiredConcepts.length,
      ),
      missingConceptIds: spec.concepts.filter((concept) => !hasUsableConceptCandidate(concept.id)).map((concept) => concept.id),
      evidenceLevels: {
        direct: candidates.filter((candidate) => candidate.evidenceLevel === "direct").length,
        supporting: candidates.filter((candidate) => candidate.evidenceLevel === "supporting").length,
        discoveryOnly: candidates.filter((candidate) => candidate.evidenceLevel === "discovery-only").length,
      },
      concepts: Object.fromEntries(spec.concepts.map((concept) => [concept.id, topic.byConcept[concept.id].map((candidate, index) => ({
        rank: index + 1,
        evidenceUnitId: candidate.evidenceUnitId,
        title: candidate.title,
        evidenceLevel: candidate.evidenceLevel,
        rerankScore: candidate.rerankScore,
        baselineLabel: baselineLabels.get(`${spec.id}:${candidate.evidenceUnitId}`) ?? null,
      }))])),
      candidates,
    }];
  }));

  const integrated = Object.values(shadow.topics).flatMap((topic) => topic.integrated);
  assert.equal(integrated.some((candidate) => candidate.evidenceLevel === "discovery-only"), false, "요약문은 통합 근거 후보가 될 수 없습니다.");
  assert.equal(integrated.some((candidate) => candidate.evidenceUnitId === "blog:clear-aligner-care-guide:summary"), false, "투명교정 요약문이 통증 근거로 재진입했습니다.");
  assert.equal(integrated.some((candidate) => candidate.documentId === "blog:loose-tooth-does-it-need-extraction"), false, "성인 흔들림 콘텐츠가 소아 외상 후보로 재진입했습니다.");
  const frontChildCandidate = shadow.topics["front-teeth-treatment"].integrated.find((candidate) => candidate.evidenceUnitId === "blog:children-dental-care:section:5-6");
  assert.equal(frontChildCandidate?.matchedConceptIds.includes("diagnosis"), true, "소아 앞니 문단은 진단 보조 근거여야 합니다.");
  assert.equal(frontChildCandidate?.matchedConceptIds.includes("aesthetics"), false, "소아 앞니 문단을 심미 근거로 분류하면 안 됩니다.");
  const brushingCandidates = shadow.topics["oral-hygiene"].byConcept.brushing;
  assert.equal(brushingCandidates.some((candidate) => candidate.evidenceUnitId === "blog:interdental-brush-waterpik-guide:section:8-9"), false, "치간도구 사용 순서를 칫솔질 방법으로 분류하면 안 됩니다.");
  assert.equal(brushingCandidates.some((candidate) => candidate.evidenceUnitId === "blog:mouthwash-effectiveness:section:6-7"), false, "구강청결제 사용법을 칫솔질 방법으로 분류하면 안 됩니다.");
  assert.equal(shadow.topics["oral-hygiene"].byConcept.devices.some((candidate) => candidate.documentId === "blog:mouthwash-effectiveness"), true, "구강청결제 콘텐츠는 보조 관리도구 후보에 포함되어야 합니다.");

  const report = {
    version: shadow.version,
    generatedAt: shadow.generatedAt,
    cache: shadow.cache,
    baseline: {
      model: baseline.model,
      generatedAt: baseline.generatedAt,
      labeled: baseline.items.filter((item) => item.label != null).length,
    },
    comparisons,
  };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: OUTPUT_PATH,
    version: shadow.version,
    cache: shadow.cache,
    topics: Object.fromEntries(Object.entries(comparisons).map(([topicSpecId, comparison]) => [topicSpecId, {
      knownCandidates: comparison.knownCandidates,
      newReviewCount: comparison.newReviewCount,
      retainedBaselineCandidates: comparison.retainedBaselineCandidates,
      knownUsablePrecisionAt3: comparison.knownUsablePrecisionAt3,
      unknownAt3: comparison.unknownAt3,
      knownIrrelevantRateAt10: comparison.knownIrrelevantRateAt10,
      exclusionLeakageCount: comparison.exclusionLeakageCount,
      conceptCandidateCoverage: comparison.conceptCandidateCoverage,
      requiredConceptCandidateCoverage: comparison.requiredConceptCandidateCoverage,
      missingConceptIds: comparison.missingConceptIds,
      evidenceLevels: comparison.evidenceLevels,
    }])),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
