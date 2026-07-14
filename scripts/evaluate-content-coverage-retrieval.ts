import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import { RETRIEVAL_REVIEW_SEED } from "../lib/content-coverage/generated/retrieval-review-seed";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import {
  applyRetrievalReviewBaseline,
  evaluateRetrievalReview,
  summarizeRetrievalReviewReasons,
  type RetrievalReviewBaseline,
  type RetrievalReviewFile,
} from "../lib/content-coverage/retrieval-evaluation";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const reviewPath = path.resolve(process.cwd(), process.argv[2] ?? "lib/content-coverage/generated/retrieval-review-baseline.json");

async function main() {
  const input = JSON.parse(await readFile(reviewPath, "utf8")) as RetrievalReviewBaseline | RetrievalReviewFile;
  const file = input.schemaVersion === "retrieval-review-baseline-v1"
    ? applyRetrievalReviewBaseline(RETRIEVAL_REVIEW_SEED, input)
    : input;
  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const lexical = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, 10);
  console.log(JSON.stringify({
    ...evaluateRetrievalReview(file, lexical),
    reasonSummary: summarizeRetrievalReviewReasons(file),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
