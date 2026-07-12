import fs from "node:fs";
import path from "node:path";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import { buildSemanticBaseline } from "../lib/content-coverage/semantic-retrieval";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { GEMINI_EMBEDDING_DIMS, GEMINI_EMBEDDING_MODEL } from "../lib/gemini-embeddings";
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

async function main() {
  const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
  const lexical = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, 10);
  const semantic = await buildSemanticBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, { limit: 10 });
  console.log(JSON.stringify({
    engine: "coverage-v2.0-semantic-shadow",
    embedding: { model: GEMINI_EMBEDDING_MODEL, dimensions: GEMINI_EMBEDDING_DIMS, cache: semantic.cache },
    evidence: snapshot.stats,
    topics: COVERAGE_TOPIC_SPECS.map((spec) => {
      const lexicalIds = new Set(lexical[spec.id].map((candidate) => candidate.evidenceUnitId));
      return {
        id: spec.id,
        label: spec.label,
        lexicalCount: lexical[spec.id].length,
        overlapInSemanticTop10: semantic.candidates[spec.id].filter((candidate) => lexicalIds.has(candidate.evidenceUnitId)).length,
        semanticCandidates: semantic.candidates[spec.id].map((candidate, index) => ({
          rank: index + 1,
          documentId: candidate.documentId,
          evidenceUnitId: candidate.evidenceUnitId,
          title: candidate.title,
          headingPath: candidate.headingPath,
          path: candidate.path,
          surface: candidate.surface,
          role: candidate.role,
          similarity: Math.round(candidate.similarity * 10_000) / 10_000,
          foundByLexical: lexicalIds.has(candidate.evidenceUnitId),
          excerpt: candidate.excerpt,
        })),
      };
    }),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
