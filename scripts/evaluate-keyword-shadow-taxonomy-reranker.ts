import fs from "node:fs";
import path from "node:path";
import { getActiveKeywordTaxonomy, getKeywordTaxonomyByVersion } from "../lib/admin-keyword-taxonomy";
import type { SearchAdKeywordData } from "../lib/admin-naver-searchad";
import { formatEmbeddingSearchDocument } from "../lib/gemini-embeddings";
import { buildKeywordEvaluationPool } from "../lib/keyword-candidate-evaluation";
import { getKeywordCandidateEvaluationData } from "../lib/keyword-candidate-evaluation-store";
import {
  getKeywordCandidateShadowAuditData,
  getKeywordCandidateShadowAuditReferences,
} from "../lib/keyword-candidate-shadow-audit-store";
import { embedKeywordShadowTexts } from "../lib/keyword-candidate-shadow-embeddings";
import {
  buildTaxonomyShadowAnchors,
  KEYWORD_SHADOW_ENGINE_VERSION,
  mergeKeywordShadowReferences,
  normalizeShadowVector,
  predictKeywordCandidateShadow,
  type ShadowReference,
} from "../lib/keyword-candidate-shadow";
import { getSupabaseAdmin } from "../lib/supabase-admin";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/keyword-shadow-taxonomy-reranker-evaluation.json");

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

function normalizeKeyword(keyword: string): string {
  return keyword.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function matchesPlacement(
  candidate: { category: string; subgroup: string } | undefined,
  expected: { category: string | null; subgroup: string | null },
) {
  return candidate?.category === expected.category && candidate.subgroup === expected.subgroup;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const [evaluation, audit] = await Promise.all([
    getKeywordCandidateEvaluationData(),
    getKeywordCandidateShadowAuditData(),
  ]);
  if (evaluation.items.some((item) => !item.humanLabel) || audit.items.some((item) => !item.humanLabel)) {
    throw new Error("초기 평가와 활성 감사 세트를 먼저 모두 확정해야 합니다.");
  }
  const [{ data: snapshot, error }, taxonomyState, savedAuditReferences] = await Promise.all([
    getSupabaseAdmin().from("searchad_snapshots").select("data").eq("id", evaluation.snapshotId).single(),
    evaluation.taxonomyVersion == null
      ? getActiveKeywordTaxonomy()
      : getKeywordTaxonomyByVersion(evaluation.taxonomyVersion),
    getKeywordCandidateShadowAuditReferences(evaluation.snapshotId),
  ]);
  if (error) throw error;
  if (!Array.isArray(snapshot.data)) throw new Error("평가 스냅샷 데이터가 없습니다.");

  const poolByKeyword = new Map(buildKeywordEvaluationPool(
    taxonomyState.taxonomy,
    snapshot.data as SearchAdKeywordData[],
  ).map((item) => [normalizeKeyword(item.keyword), item]));
  const evaluationReferences: ShadowReference[] = evaluation.items.map((item) => ({
    id: `evaluation:${item.id}`,
    keyword: item.keyword,
    label: item.humanLabel!,
  }));
  const references = mergeKeywordShadowReferences(savedAuditReferences, evaluationReferences);
  const anchors = buildTaxonomyShadowAnchors(taxonomyState.taxonomy);
  const referenceTexts = references.map((reference) => formatEmbeddingSearchDocument("keyword", reference.keyword));
  const anchorTexts = anchors.map((anchor) => formatEmbeddingSearchDocument("taxonomy subgroup", anchor.text));
  const embedded = await embedKeywordShadowTexts([...referenceTexts, ...anchorTexts]);
  const vectors = embedded.vectors.map(normalizeShadowVector);
  const referenceVectors = new Map(references.map((reference, index) => [reference.id, vectors[index]]));
  const anchorVectors = new Map(anchors.map((anchor, index) => [anchor.id, vectors[references.length + index]]));
  const evaluateReference = (reference: ShadowReference) => {
    const poolItem = poolByKeyword.get(normalizeKeyword(reference.keyword));
    if (!poolItem) throw new Error(`평가 대상 벡터를 찾을 수 없습니다: ${reference.keyword}`);
    const prediction = predictKeywordCandidateShadow({
      item: { ...poolItem, id: reference.id },
      references: references.filter((item) => item.id !== reference.id),
      itemVector: referenceVectors.get(reference.id)!,
      referenceVectors,
      anchors,
      anchorVectors,
    });
    return {
      keyword: reference.keyword,
      expected: reference.label,
      predictedRelevance: prediction.relevance,
      predictedPurpose: prediction.purpose,
      predictedAction: prediction.action,
      rerankedCandidates: prediction.taxonomyCandidates,
    };
  };
  const activeResults = audit.items.map((target) => {
    const reference = references.find((item) =>
      item.id.includes(target.id) && normalizeKeyword(item.keyword) === normalizeKeyword(target.keyword),
    );
    if (!reference) throw new Error(`활성 감사 참조를 찾을 수 없습니다: ${target.keyword}`);
    return {
      ...evaluateReference(reference),
      previousPurpose: target.predictedPurpose,
      previousCandidates: target.taxonomyCandidates,
    };
  });
  const results = activeResults.filter((result) => result.expected.purpose === "taxonomy");
  const allCrossValidationResults = references.map(evaluateReference);
  const crossValidationResults = allCrossValidationResults.filter((result) =>
    result.expected.purpose === "taxonomy" && result.expected.category && result.expected.subgroup,
  );
  const metrics = {
    previousPurposeAccuracy: activeResults.filter((result) => result.previousPurpose === result.expected.purpose).length / activeResults.length,
    rerankedPurposeAccuracy: activeResults.filter((result) => result.predictedPurpose === result.expected.purpose).length / activeResults.length,
    previousTop1: results.filter((result) => matchesPlacement(result.previousCandidates[0], result.expected)).length / results.length,
    previousTop3: results.filter((result) => result.previousCandidates.some((candidate) => matchesPlacement(candidate, result.expected))).length / results.length,
    rerankedTop1: results.filter((result) => matchesPlacement(result.rerankedCandidates[0], result.expected)).length / results.length,
    rerankedTop3: results.filter((result) => result.rerankedCandidates.some((candidate) => matchesPlacement(candidate, result.expected))).length / results.length,
    crossValidationTargets: crossValidationResults.length,
    crossValidationRelevanceAccuracy: allCrossValidationResults.filter((result) => result.predictedRelevance === result.expected.relevance).length / allCrossValidationResults.length,
    crossValidationPurposeAccuracy: allCrossValidationResults.filter((result) => result.predictedPurpose === result.expected.purpose).length / allCrossValidationResults.length,
    crossValidationTop1: crossValidationResults.filter((result) => matchesPlacement(result.rerankedCandidates[0], result.expected)).length / crossValidationResults.length,
    crossValidationTop3: crossValidationResults.filter((result) => result.rerankedCandidates.some((candidate) => matchesPlacement(candidate, result.expected))).length / crossValidationResults.length,
  };
  const output = {
    engine: KEYWORD_SHADOW_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    references: {
      evaluation: evaluationReferences.length,
      audits: savedAuditReferences.length,
      deduplicated: references.length,
    },
    targets: results.length,
    metrics,
    errors: results.filter((result) => !matchesPlacement(result.rerankedCandidates[0], result.expected)).map((result) => ({
      keyword: result.keyword,
      expected: `${result.expected.category}/${result.expected.subgroup}`,
      candidates: result.rerankedCandidates,
    })),
    purposeErrors: activeResults.filter((result) => result.predictedPurpose !== result.expected.purpose).map((result) => ({
      keyword: result.keyword,
      expected: result.expected.purpose,
      previous: result.previousPurpose,
      predicted: result.predictedPurpose,
    })),
    crossValidationErrors: crossValidationResults.filter((result) => !matchesPlacement(result.rerankedCandidates[0], result.expected)).map((result) => ({
      keyword: result.keyword,
      expected: `${result.expected.category}/${result.expected.subgroup}`,
      candidates: result.rerankedCandidates,
    })),
    crossValidationRelevanceErrors: allCrossValidationResults.filter((result) => result.predictedRelevance !== result.expected.relevance).map((result) => ({
      keyword: result.keyword,
      expected: result.expected.relevance,
      predicted: result.predictedRelevance,
    })),
    crossValidationPurposeErrors: allCrossValidationResults.filter((result) => result.predictedPurpose !== result.expected.purpose).map((result) => ({
      keyword: result.keyword,
      expected: result.expected.purpose,
      predicted: result.predictedPurpose,
    })),
  };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    ...output,
    errors: output.errors.map((error) => ({ keyword: error.keyword, expected: error.expected, predicted: error.candidates[0] })),
    crossValidationErrors: output.crossValidationErrors.map((error) => ({ keyword: error.keyword, expected: error.expected, predicted: error.candidates[0] })),
    crossValidationRelevanceErrors: output.crossValidationRelevanceErrors,
    crossValidationPurposeErrors: output.crossValidationPurposeErrors,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
