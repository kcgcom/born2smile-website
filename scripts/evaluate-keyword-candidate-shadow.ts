import fs from "node:fs";
import path from "node:path";
import { getActiveKeywordTaxonomy, getKeywordTaxonomyByVersion } from "../lib/admin-keyword-taxonomy";
import {
  formatEmbeddingSearchDocument,
  GEMINI_EMBEDDING_DIMS,
  GEMINI_EMBEDDING_MODEL,
} from "../lib/gemini-embeddings";
import { getKeywordCandidateEvaluationData } from "../lib/keyword-candidate-evaluation-store";
import {
  buildTaxonomyShadowAnchors,
  KEYWORD_SHADOW_ENGINE_VERSION,
  normalizeShadowVector,
  predictKeywordCandidateShadow,
  type ShadowReference,
} from "../lib/keyword-candidate-shadow";
import { embedKeywordShadowTexts } from "../lib/keyword-candidate-shadow-embeddings";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/keyword-candidate-shadow-evaluation.json");

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

function ratio(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const evaluation = await getKeywordCandidateEvaluationData();
  if (evaluation.items.some((item) => !item.humanLabel)) throw new Error("300개 평가 세트를 먼저 모두 확정해야 합니다.");
  const taxonomyState = evaluation.taxonomyVersion == null
    ? await getActiveKeywordTaxonomy()
    : await getKeywordTaxonomyByVersion(evaluation.taxonomyVersion);
  const anchors = buildTaxonomyShadowAnchors(taxonomyState.taxonomy);
  const itemTexts = evaluation.items.map((item) => formatEmbeddingSearchDocument("keyword", item.keyword));
  const anchorTexts = anchors.map((anchor) => formatEmbeddingSearchDocument("taxonomy subgroup", anchor.text));
  const embedded = await embedKeywordShadowTexts([...itemTexts, ...anchorTexts]);
  const normalizedVectors = embedded.vectors.map(normalizeShadowVector);
  const itemVectors = new Map(evaluation.items.map((item, index) => [item.id, normalizedVectors[index]]));
  const anchorVectors = new Map(anchors.map((anchor, index) => [anchor.id, normalizedVectors[itemTexts.length + index]]));
  const references: ShadowReference[] = evaluation.items.map((item) => ({
    id: item.id,
    keyword: item.keyword,
    label: item.humanLabel!,
  }));

  const results = evaluation.items.map((item) => {
    const prediction = predictKeywordCandidateShadow({
      item,
      references: references.filter((reference) => reference.id !== item.id),
      itemVector: itemVectors.get(item.id)!,
      referenceVectors: itemVectors,
      anchors,
      anchorVectors,
    });
    return { item, expected: item.humanLabel!, prediction };
  });

  const expectedRelevant = results.filter((result) => result.expected.relevance === "relevant");
  const predictedRelevant = results.filter((result) => result.prediction.relevance === "relevant");
  const trueRelevant = predictedRelevant.filter((result) => result.expected.relevance === "relevant");
  const currentPredicted = results.filter((result) => result.item.currentSurface);
  const currentTrue = currentPredicted.filter((result) => result.expected.relevance === "relevant");
  const relevantResults = results.filter((result) => result.expected.relevance === "relevant");
  const taxonomyResults = results.filter((result) => result.expected.purpose === "taxonomy" && result.expected.category && result.expected.subgroup);
  const evaluatedPurposes = ["taxonomy", "content", "faq", "product", "local"] as const;
  const purposeTop20Precision = Object.fromEntries(evaluatedPurposes.map((purpose) => {
    const top = results
      .filter((result) => result.prediction.relevance === "relevant" && result.prediction.purpose === purpose)
      .sort((a, b) => {
        const scoreA = a.prediction.relevanceConfidence * a.prediction.purposeConfidence * Math.log1p(a.item.monthlyVolume);
        const scoreB = b.prediction.relevanceConfidence * b.prediction.purposeConfidence * Math.log1p(b.item.monthlyVolume);
        return scoreB - scoreA || b.item.monthlyVolume - a.item.monthlyVolume;
      })
      .slice(0, 20);
    return [purpose, { precision: ratio(top.filter((result) => result.expected.purpose === purpose).length, top.length), evaluated: top.length }];
  }));
  const purposeRecall = Object.fromEntries(evaluatedPurposes.map((purpose) => {
    const expected = relevantResults.filter((result) => result.expected.purpose === purpose);
    return [purpose, ratio(expected.filter((result) => result.prediction.purpose === purpose).length, expected.length)];
  }));
  const metrics = {
    current: {
      surfaced: currentPredicted.length,
      relevancePrecision: ratio(currentTrue.length, currentPredicted.length),
      relevanceRecall: ratio(currentTrue.length, expectedRelevant.length),
    },
    shadow: {
      predictedRelevant: predictedRelevant.length,
      relevancePrecision: ratio(trueRelevant.length, predictedRelevant.length),
      relevanceRecall: ratio(trueRelevant.length, expectedRelevant.length),
      relevanceF1: ratio(2 * trueRelevant.length, predictedRelevant.length + expectedRelevant.length),
      purposeAccuracy: ratio(relevantResults.filter((result) => result.prediction.purpose === result.expected.purpose).length, relevantResults.length),
      actionAccuracy: ratio(results.filter((result) => result.prediction.action === result.expected.action).length, results.length),
      purposeTop20Precision,
      purposeRecall,
      taxonomyTop1Accuracy: ratio(taxonomyResults.filter((result) => {
        const top = result.prediction.taxonomyCandidates[0];
        return top?.category === result.expected.category && top.subgroup === result.expected.subgroup;
      }).length, taxonomyResults.length),
      taxonomyTop3Recall: ratio(taxonomyResults.filter((result) => result.prediction.taxonomyCandidates.some((candidate) =>
        candidate.category === result.expected.category && candidate.subgroup === result.expected.subgroup,
      )).length, taxonomyResults.length),
    },
  };
  const output = {
    engine: KEYWORD_SHADOW_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    evaluationSnapshotId: evaluation.snapshotId,
    taxonomyVersion: evaluation.taxonomyVersion,
    embedding: { model: GEMINI_EMBEDDING_MODEL, dimensions: GEMINI_EMBEDDING_DIMS, cache: { hits: embedded.hits, misses: embedded.misses } },
    metrics,
    errors: results.filter((result) =>
      result.prediction.relevance !== result.expected.relevance
      || (result.expected.relevance === "relevant" && result.prediction.purpose !== result.expected.purpose),
    ).map((result) => ({
      keyword: result.item.keyword,
      volume: result.item.monthlyVolume,
      expected: { relevance: result.expected.relevance, purpose: result.expected.purpose, action: result.expected.action },
      predicted: { relevance: result.prediction.relevance, purpose: result.prediction.purpose, action: result.prediction.action },
      nearestExamples: result.prediction.nearestExamples,
    })),
  };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ engine: output.engine, embedding: output.embedding, metrics, errors: output.errors.length, output: path.relative(process.cwd(), OUTPUT_PATH) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
