import fs from "node:fs";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { buildConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { buildConceptShadowRetrieval } from "../lib/content-coverage/concept-shadow-retrieval";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import retrievalReviewBaselineJson from "../lib/content-coverage/generated/retrieval-review-baseline.json";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { applyRetrievalReviewBaseline, type RetrievalReviewBaseline } from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

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

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const [{ getAllPublishedPostsUncached }, { calculateTargetEvidenceRevision }, reevaluationStore] = await Promise.all([
    import("../lib/blog-supabase"),
    import("../lib/content-coverage/operational-evidence"),
    import("../lib/content-coverage/reevaluation-store"),
  ]);
  const requestedActionKey = argument("action-key");
  const state = await reevaluationStore.claimContentReevaluation(requestedActionKey);
  if (!state) {
    console.log(JSON.stringify({ processed: false, reason: "pending-request-not-found" }, null, 2));
    return;
  }
  try {
    if (!state.topicSpecId) throw new Error("재평가 요청에 주제 명세가 없습니다.");
    const spec = COVERAGE_TOPIC_SPECS.find((candidate) => candidate.id === state.topicSpecId);
    if (!spec) throw new Error(`주제 명세를 찾을 수 없습니다: ${state.topicSpecId}`);
    const posts = await getAllPublishedPostsUncached() as BlogPost[];
    const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, new Date().toISOString());
    const observedRevision = calculateTargetEvidenceRevision(snapshot, state.targetPath);
    const shadow = await buildConceptShadowRetrieval([spec], snapshot.documents);
    const retrievalBaseline = applyRetrievalReviewBaseline(
      RETRIEVAL_REVIEW_SEED,
      retrievalReviewBaselineJson as unknown as RetrievalReviewBaseline,
    );
    const candidateSet = buildConceptReviewSeed([spec], shadow, retrievalBaseline);
    const completed = await reevaluationStore.completeContentReevaluationGeneration(state.actionKey, candidateSet, observedRevision);
    console.log(JSON.stringify({
      processed: true,
      actionKey: state.actionKey,
      topicSpecId: state.topicSpecId,
      observedRevision,
      candidates: completed.candidateSet?.items.length ?? 0,
      cache: shadow.cache,
      status: completed.status,
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 재평가 오류";
    await reevaluationStore.failContentReevaluationGeneration(state.actionKey, message);
    throw error;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
