import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildConceptReviewSeed } from "../lib/content-coverage/concept-review";
import { buildConceptShadowRetrieval } from "../lib/content-coverage/concept-shadow-retrieval";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import retrievalReviewBaselineJson from "../lib/content-coverage/generated/retrieval-review-baseline.json";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { applyRetrievalReviewBaseline, type RetrievalReviewBaseline } from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const OUTPUT_PATH = path.resolve(process.cwd(), "lib/content-coverage/generated/concept-review-seed.json");

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
  const baseline = applyRetrievalReviewBaseline(
    RETRIEVAL_REVIEW_SEED,
    retrievalReviewBaselineJson as unknown as RetrievalReviewBaseline,
  );
  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const shadow = await buildConceptShadowRetrieval(COVERAGE_TOPIC_SPECS, snapshot.documents);
  const seed = buildConceptReviewSeed(COVERAGE_TOPIC_SPECS, shadow, baseline);
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: OUTPUT_PATH, candidates: seed.items.length, conceptDecisions: seed.items.reduce((sum, item) => sum + item.conceptIds.length, 0) }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
