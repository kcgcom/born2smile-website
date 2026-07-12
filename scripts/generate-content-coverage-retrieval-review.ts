import fs from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import { buildRetrievalReviewItems, createRetrievalReviewFile, type RetrievalReviewFile } from "../lib/content-coverage/retrieval-evaluation";
import { buildSemanticBaseline } from "../lib/content-coverage/semantic-retrieval";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/content-coverage-retrieval-review.json");
const SEED_PATH = path.resolve(process.cwd(), "lib/content-coverage/generated/retrieval-review-seed.ts");

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

async function loadPrevious(): Promise<RetrievalReviewFile | null> {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as RetrievalReviewFile;
    return parsed.schemaVersion === "retrieval-review-v1" ? parsed : null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const lexical = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, 10);
  const semantic = await buildSemanticBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, { limit: 10 });
  const previous = await loadPrevious();
  const items = buildRetrievalReviewItems(COVERAGE_TOPIC_SPECS, semantic.candidates, lexical, previous?.items);
  const file = createRetrievalReviewFile(items);
  const seedFile = createRetrievalReviewFile(items.map((item) => ({ ...item, label: null, reasonTags: [], notes: "" })), file.generatedAt);
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  await mkdir(path.dirname(SEED_PATH), { recursive: true });
  await writeFile(SEED_PATH, `// 자동 생성: pnpm generate-content-coverage-retrieval-review\nimport type { RetrievalReviewFile } from "../retrieval-evaluation";\n\nexport const RETRIEVAL_REVIEW_SEED: RetrievalReviewFile = ${JSON.stringify(seedFile, null, 2)};\n`, "utf8");
  console.log(JSON.stringify({ output: OUTPUT_PATH, seed: SEED_PATH, items: items.length, preservedLabels: items.filter((item) => item.label != null).length, cache: semantic.cache }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
