import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { applyConceptReviewBaseline, evaluateConceptReview, type ConceptReviewBaseline, type ConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { buildConceptShadowRetrieval, type ConceptFallbackAuditTarget } from "../lib/content-coverage/concept-shadow-retrieval";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import conceptReviewBaselineJson from "../lib/content-coverage/generated/concept-review-baseline.json";
import conceptReviewSeedJson from "../lib/content-coverage/generated/concept-review-seed.json";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/content-coverage-fallback-audit.json");

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

async function main() {
  const reviewed = applyConceptReviewBaseline(
    conceptReviewSeedJson as unknown as ConceptReviewSeed,
    conceptReviewBaselineJson as unknown as ConceptReviewBaseline,
  );
  const evaluation = evaluateConceptReview(COVERAGE_TOPIC_SPECS, reviewed);
  const targets: ConceptFallbackAuditTarget[] = evaluation.topics.flatMap((topic) =>
    topic.missingRequiredConceptIds.map((conceptId) => ({ topicSpecId: topic.topicSpecId, conceptId })));
  if (targets.length === 0) throw new Error("fallback 감사가 필요한 미검색 필수 개념이 없습니다.");

  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const shadow = await buildConceptShadowRetrieval(COVERAGE_TOPIC_SPECS, snapshot.documents, {
    fallbackAuditTargets: targets,
    fallbackAuditLimit: 10,
  });
  if (!shadow.fallbackAudit) throw new Error("fallback 감사 결과가 생성되지 않았습니다.");

  const targetReports = Object.fromEntries(targets.map((target) => {
    const key = `${target.topicSpecId}:${target.conceptId}`;
    const audit = shadow.fallbackAudit?.targets[key];
    if (!audit) throw new Error(`fallback 감사 대상이 누락됐습니다: ${key}`);
    const exactIdentityCandidates = audit.candidates.filter((candidate) => candidate.identityMatches.length > 0
      && candidate.exclusionMatches.length === 0);
    const nearMissCandidates = audit.candidates.filter((candidate) => candidate.identityMatches.length === 0
      && candidate.identityScore > 0);
    const strictAccepted = audit.candidates.filter((candidate) => candidate.strictAccepted).length;
    return [key, {
      ...audit,
      summary: {
        candidates: audit.candidates.length,
        strictAccepted,
        exactIdentityCandidates: exactIdentityCandidates.length,
        nearMissCandidates: nearMissCandidates.length,
        auditState: strictAccepted > 0
          ? "recovered-by-adjusted-rules"
          : exactIdentityCandidates.length > 0 ? "manual-review-required" : "no-explicit-evidence-in-top-results",
      },
    }];
  }));

  const report = {
    schemaVersion: "content-coverage-fallback-audit-v1",
    retrievalVersion: shadow.version,
    generatedAt: shadow.generatedAt,
    source: {
      evidenceDocuments: snapshot.stats.documentCount,
      evidenceUnits: snapshot.stats.evidenceUnitCount,
      reviewBaseline: conceptReviewBaselineJson.reviewedAt,
    },
    policy: {
      purpose: "미검색 필수 개념의 전체 말뭉치 근접 후보와 기존 수용 규칙 탈락 사유를 확인한다.",
      mayConfirmCoverage: false,
      mayConfirmContentGap: false,
      nextState: "사람 검토 전까지 근거 검색 불충분",
    },
    targets: targetReports,
  };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    output: OUTPUT_PATH,
    targets: Object.fromEntries(Object.entries(targetReports).map(([key, target]) => [key, target.summary])),
    cache: shadow.cache,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
