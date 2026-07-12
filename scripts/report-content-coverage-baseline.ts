import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { buildEvidenceSnapshot } from "../lib/content-coverage/evidence";
import { buildLexicalBaseline } from "../lib/content-coverage/lexical-retrieval";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";
import { TREATMENT_DETAILS } from "../lib/treatments";

const posts = BLOG_POSTS_SNAPSHOT.filter((post) => post.published) as unknown as BlogPost[];
const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, "snapshot");
const baseline = buildLexicalBaseline(COVERAGE_TOPIC_SPECS, snapshot.documents, 10);

console.log(JSON.stringify({
  engine: "coverage-v2.0-lexical-shadow",
  evidence: snapshot.stats,
  topics: COVERAGE_TOPIC_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    searchTopicKey: spec.searchTopicKey,
    candidates: baseline[spec.id].map((candidate, index) => ({
      rank: index + 1,
      documentId: candidate.documentId,
      evidenceUnitId: candidate.evidenceUnitId,
      title: candidate.title,
      path: candidate.path,
      surface: candidate.surface,
      role: candidate.role,
      score: candidate.score,
      exactPhrases: candidate.exactPhraseMatches,
      topicTokens: candidate.topicTokenMatches,
      matchedCriteria: candidate.criterionMatches.map((match) => `${match.conceptId}.${match.criterionId}`),
      excerpt: candidate.excerpt,
    })),
  })),
}, null, 2));
