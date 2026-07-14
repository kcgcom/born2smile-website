import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getActiveKeywordTaxonomy, getKeywordTaxonomyByVersion } from "../lib/admin-keyword-taxonomy";
import type { SearchAdKeywordData } from "../lib/admin-naver-searchad";
import { formatEmbeddingSearchDocument, GEMINI_EMBEDDING_DIMS, GEMINI_EMBEDDING_MODEL } from "../lib/gemini-embeddings";
import { buildKeywordEvaluationPool } from "../lib/keyword-candidate-evaluation";
import { getKeywordCandidateEvaluationData } from "../lib/keyword-candidate-evaluation-store";
import {
  buildTaxonomyShadowAnchors,
  isKeywordShadowReviewEligible,
  KEYWORD_SHADOW_ENGINE_VERSION,
  mergeKeywordShadowReferences,
  normalizeShadowVector,
  predictKeywordCandidateShadow,
  type ShadowReference,
} from "../lib/keyword-candidate-shadow";
import { embedKeywordShadowTexts } from "../lib/keyword-candidate-shadow-embeddings";
import { publishKeywordCandidateBoundaryReview } from "../lib/keyword-candidate-boundary-review-store";
import {
  getKeywordCandidateShadowAuditReferences,
  publishKeywordCandidateShadowAudit,
} from "../lib/keyword-candidate-shadow-audit-store";
import { getSupabaseAdmin } from "../lib/supabase-admin";

const OUTPUT_PATH = path.resolve(process.cwd(), ".tmp/keyword-candidate-shadow-full.json");
const PURPOSES = ["taxonomy", "content", "faq", "product", "local", "noise", "unknown"] as const;
const AUDIT_PURPOSES = ["taxonomy", "content", "faq", "product", "local"] as const;
const BOUNDARY_REVIEW_LIMIT = 30;

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

function rankScore(result: {
  monthlyVolume: number;
  prediction: { relevanceConfidence: number; purposeConfidence: number };
}): number {
  return result.prediction.relevanceConfidence
    * result.prediction.purposeConfidence
    * Math.log1p(result.monthlyVolume);
}

function normalizeKeyword(keyword: string): string {
  return keyword.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function auditId(snapshotId: string, keyword: string): string {
  return createHash("sha1").update(`${snapshotId}:${normalizeKeyword(keyword)}`).digest("hex");
}

function boundaryReviewReasons(result: {
  productOrBrand: boolean;
  localOrRegional: boolean;
  lexical: { category: string; subgroup: string; score: number } | null;
  prediction: ReturnType<typeof predictKeywordCandidateShadow>;
}): string[] {
  const reasons: string[] = [];
  const { prediction } = result;
  const [top, second] = prediction.taxonomyCandidates;
  if (prediction.relevance === "uncertain") reasons.push("관련성 보류");
  if (prediction.relevanceConfidence < 0.75) reasons.push("관련성 저신뢰");
  if (prediction.purposeConfidence < 0.65) reasons.push("목적 저신뢰");
  if (top && second && top.hybridScore - second.hybridScore < 0.05) reasons.push("택소노미 후보 경합");
  if (result.productOrBrand && prediction.purpose !== "product") reasons.push("제품 신호 충돌");
  if (result.localOrRegional && prediction.purpose !== "local") reasons.push("지역 신호 충돌");
  if (result.lexical && top
    && (result.lexical.category !== top.category || result.lexical.subgroup !== top.subgroup)) {
    reasons.push("문자열·재정렬 위치 충돌");
  }
  return reasons;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const evaluation = await getKeywordCandidateEvaluationData();
  if (evaluation.items.some((item) => !item.humanLabel)) {
    throw new Error("300개 평가 세트를 먼저 모두 확정해야 합니다.");
  }
  const [{ data: snapshot, error }, taxonomyState] = await Promise.all([
    getSupabaseAdmin()
      .from("searchad_snapshots")
      .select("id,data,created_at,taxonomy_version")
      .eq("id", evaluation.snapshotId)
      .single(),
    evaluation.taxonomyVersion == null
      ? getActiveKeywordTaxonomy()
      : getKeywordTaxonomyByVersion(evaluation.taxonomyVersion),
  ]);
  if (error) throw error;
  if (!Array.isArray(snapshot.data)) throw new Error("평가 세트의 SearchAd 스냅샷 데이터가 없습니다.");

  const savedAuditReferences = await getKeywordCandidateShadowAuditReferences(evaluation.snapshotId).catch(() => []);

  const pool = buildKeywordEvaluationPool(taxonomyState.taxonomy, snapshot.data as SearchAdKeywordData[]);
  const anchors = buildTaxonomyShadowAnchors(taxonomyState.taxonomy);
  const evaluationReferences: ShadowReference[] = evaluation.items.map((item) => ({
    id: item.id,
    keyword: item.keyword,
    label: item.humanLabel!,
  }));
  const auditReferences: ShadowReference[] = savedAuditReferences;
  const references = mergeKeywordShadowReferences(auditReferences, evaluationReferences);
  const referenceTexts = references.map((reference) => formatEmbeddingSearchDocument("keyword", reference.keyword));
  const evaluatedKeywords = new Set(references.map((reference) => normalizeKeyword(reference.keyword)));
  const poolTexts = pool.map((item) => formatEmbeddingSearchDocument("keyword", item.keyword));
  const anchorTexts = anchors.map((anchor) => formatEmbeddingSearchDocument("taxonomy subgroup", anchor.text));
  const embedded = await embedKeywordShadowTexts([...referenceTexts, ...poolTexts, ...anchorTexts]);
  const normalizedVectors = embedded.vectors.map(normalizeShadowVector);
  const poolOffset = referenceTexts.length;
  const anchorOffset = poolOffset + poolTexts.length;
  const referenceVectors = new Map(references.map((reference, index) => [reference.id, normalizedVectors[index]]));
  const anchorVectors = new Map(anchors.map((anchor, index) => [anchor.id, normalizedVectors[anchorOffset + index]]));

  const results = pool.map((item, index) => {
    const prediction = predictKeywordCandidateShadow({
      item: { ...item, id: `pool:${index}` },
      references,
      itemVector: normalizedVectors[poolOffset + index],
      referenceVectors,
      anchors,
      anchorVectors,
    });
    return {
      keyword: item.keyword,
      monthlyVolume: item.monthlyVolume,
      currentSurface: item.currentSurface,
      alreadyRegistered: item.alreadyRegistered,
      productOrBrand: item.productOrBrand,
      localOrRegional: item.localOrRegional,
      evaluatedReference: evaluatedKeywords.has(normalizeKeyword(item.keyword)),
      lexical: item.lexicalCategory && item.lexicalSubgroup
        ? { category: item.lexicalCategory, subgroup: item.lexicalSubgroup, score: item.lexicalScore }
        : null,
      prediction,
      reviewEligible: isKeywordShadowReviewEligible(item.keyword, prediction),
    };
  });
  const unregistered = results.filter((result) => !result.alreadyRegistered);
  const shadowRelevantPool = unregistered.filter((result) =>
    !result.evaluatedReference
    && result.reviewEligible,
  );
  const topByPurpose = Object.fromEntries(PURPOSES.map((purpose) => [purpose, shadowRelevantPool
    .filter((result) => result.prediction.purpose === purpose)
    .sort((a, b) => rankScore(b) - rankScore(a) || b.monthlyVolume - a.monthlyVolume)
    .slice(0, 100)
    .map((result) => ({
      keyword: result.keyword,
      monthlyVolume: result.monthlyVolume,
      score: rankScore(result),
      action: result.prediction.action,
      relevanceConfidence: result.prediction.relevanceConfidence,
      purposeConfidence: result.prediction.purposeConfidence,
      taxonomyCandidates: result.prediction.taxonomyCandidates,
    }))]));
  const auditQueue = AUDIT_PURPOSES.flatMap((purpose) => topByPurpose[purpose].slice(0, 20).map((item) => ({
    purpose,
    ...item,
  })));
  const boundaryReviewQueue = unregistered
    .filter((result) => !result.evaluatedReference && result.prediction.relevance !== "irrelevant")
    .map((result) => ({ ...result, boundaryReasons: boundaryReviewReasons(result) }))
    .filter((result) => result.boundaryReasons.length > 0)
    .sort((a, b) =>
      b.boundaryReasons.length - a.boundaryReasons.length
      || a.prediction.purposeConfidence - b.prediction.purposeConfidence
      || b.monthlyVolume - a.monthlyVolume,
    )
    .slice(0, BOUNDARY_REVIEW_LIMIT)
    .map((result) => ({
      keyword: result.keyword,
      monthlyVolume: result.monthlyVolume,
      reasons: result.boundaryReasons,
      predictedRelevance: result.prediction.relevance,
      predictedPurpose: result.prediction.purpose,
      predictedAction: result.prediction.action,
      relevanceConfidence: result.prediction.relevanceConfidence,
      purposeConfidence: result.prediction.purposeConfidence,
      taxonomyCandidates: result.prediction.taxonomyCandidates,
    }));
  const countBy = <T extends string>(values: T[]) => Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
  );
  const generatedAt = new Date().toISOString();
  const output = {
    engine: KEYWORD_SHADOW_ENGINE_VERSION,
    generatedAt,
    source: {
      evaluationSnapshotId: evaluation.snapshotId,
      snapshotCreatedAt: snapshot.created_at,
      taxonomyVersion: evaluation.taxonomyVersion,
      confirmedReferences: references.length,
      evaluationReferences: evaluationReferences.length,
      auditReferences: auditReferences.length,
      duplicateReferencesRemoved: evaluationReferences.length + auditReferences.length - references.length,
    },
    embedding: {
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMS,
      cache: { hits: embedded.hits, misses: embedded.misses },
    },
    summary: {
      pool: results.length,
      unregistered: unregistered.length,
      evaluatedReferences: unregistered.filter((result) => result.evaluatedReference).length,
      currentSurfaced: unregistered.filter((result) => result.currentSurface).length,
      shadowRelevantPool: shadowRelevantPool.length,
      auditQueue: auditQueue.length,
      boundaryReviewQueue: boundaryReviewQueue.length,
      relevance: countBy(unregistered.map((result) => result.prediction.relevance)),
      purpose: countBy(unregistered.map((result) => result.prediction.purpose)),
      action: countBy(unregistered.map((result) => result.prediction.action)),
    },
    auditQueue,
    boundaryReviewQueue,
    topByPurpose,
    results,
  };
  let publication: { published: number; preservedLabels: number } | null = null;
  if (process.argv.includes("--publish")) {
    publication = await publishKeywordCandidateShadowAudit({
      engineVersion: KEYWORD_SHADOW_ENGINE_VERSION,
      datasetRole: "holdout",
      snapshotId: evaluation.snapshotId,
      snapshotCreatedAt: snapshot.created_at,
      taxonomyVersion: evaluation.taxonomyVersion,
      generatedAt,
      items: auditQueue.map((item) => ({
        id: auditId(evaluation.snapshotId, item.keyword),
        keyword: item.keyword,
        monthlyVolume: item.monthlyVolume,
        purposeRank: topByPurpose[item.purpose].findIndex((candidate) => candidate.keyword === item.keyword) + 1,
        predictedRelevance: "relevant" as const,
        predictedPurpose: item.purpose,
        predictedAction: item.action,
        relevanceConfidence: item.relevanceConfidence,
        purposeConfidence: item.purposeConfidence,
        taxonomyCandidates: item.taxonomyCandidates,
      })).sort((a, b) => a.id.localeCompare(b.id)),
      taxonomy: taxonomyState.taxonomy.map((category) => ({
        slug: category.slug,
        label: category.category,
        subgroups: category.subGroups.map((subgroup) => subgroup.name),
      })),
    });
  }
  let boundaryPublication: { published: number; preservedLabels: number } | null = null;
  if (process.argv.includes("--publish-boundary")) {
    boundaryPublication = await publishKeywordCandidateBoundaryReview({
      engineVersion: KEYWORD_SHADOW_ENGINE_VERSION,
      snapshotId: evaluation.snapshotId,
      snapshotCreatedAt: snapshot.created_at,
      taxonomyVersion: evaluation.taxonomyVersion,
      generatedAt,
      items: boundaryReviewQueue.map((item) => ({
        id: auditId(evaluation.snapshotId, item.keyword),
        ...item,
      })),
      taxonomy: taxonomyState.taxonomy.map((category) => ({
        slug: category.slug,
        label: category.category,
        subgroups: category.subGroups.map((subgroup) => subgroup.name),
      })),
    });
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    engine: output.engine,
    embedding: output.embedding,
    summary: output.summary,
    topPurposeCounts: Object.fromEntries(Object.entries(topByPurpose).map(([purpose, items]) => [purpose, items.length])),
    publication,
    boundaryPublication,
    output: path.relative(process.cwd(), OUTPUT_PATH),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
