import fs from "node:fs";
import path from "node:path";
import {
  getKeywordCandidateEvaluationData,
  saveKeywordCandidateActionPreReviews,
} from "../lib/keyword-candidate-evaluation-store";
import type { EvaluationAction } from "../lib/keyword-candidate-evaluation";

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

function reviewAction(item: Awaited<ReturnType<typeof getKeywordCandidateEvaluationData>>["items"][number]): EvaluationAction {
  const purpose = item.purposePreReview?.purpose;
  if (purpose === "noise") return "reject";
  if (purpose === "unknown" || !purpose) return "review";
  if (purpose !== "taxonomy") return "approve";
  if ((!item.lexicalCategory || !item.lexicalSubgroup) && !item.placementPreReview) return "reclassify";
  if (item.monthlyVolume < 100) return "defer";
  return "approve";
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const evaluation = await getKeywordCandidateEvaluationData();
  if (evaluation.items.length !== 300) throw new Error(`평가 세트가 300개가 아닙니다: ${evaluation.items.length}`);
  if (evaluation.items.some((item) => !item.relevancePreReview || !item.purposePreReview)) {
    throw new Error("관련성과 활용 목적 사전 검토를 먼저 완료해야 합니다.");
  }

  const reviews = evaluation.items.map((item) => ({ id: item.id, action: reviewAction(item) }));
  const actions: EvaluationAction[] = ["approve", "defer", "reject", "reclassify", "review"];
  const counts = Object.fromEntries(actions.map((action) => [action, reviews.filter((review) => review.action === action).length]));
  const examples = Object.fromEntries(actions.map((action) => [action, evaluation.items
    .filter((item) => reviews.find((review) => review.id === item.id)?.action === action)
    .slice(0, 10)
    .map((item) => item.keyword)]));
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "preview", counts, examples }, null, 2));
    return;
  }
  const result = await saveKeywordCandidateActionPreReviews(reviews, "codex-pre-review");
  console.log({ mode: "applied", ...result, counts });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
