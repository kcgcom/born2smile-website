/**
 * Gemini Embedding API integration for semantic keyword clustering.
 * - Stores embeddings in Supabase `api_cache` table
 * - Only embeds new keywords (diff against cache)
 * - Clusters via cosine similarity + Union-Find
 */

import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabase-admin";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type EmbeddingCache = Record<string, number[]>; // query → vector

export type SemanticCluster = {
  representative: string;
  keywords: Array<{
    query: string;
    similarity: number;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

type QueryRow = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------

export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
export const KEYWORD_EMBEDDING_DIMS = 768; // Google 권장 MRL 차원 — 품질과 저장 효율의 균형
const GEMINI_MODEL = GEMINI_EMBEDDING_MODEL;
const EMBEDDING_DIMS = KEYWORD_EMBEDDING_DIMS;
const CACHE_KEY = `keyword-embeddings:${GEMINI_MODEL}:${EMBEDDING_DIMS}`;
export const KEYWORD_CLUSTER_THRESHOLD = 0.97; // 실제 SC 평가 최적값 — 오병합 억제 우선
export const KEYWORD_MIN_TOKEN_JACCARD = 0.3; // 토큰 겹침 최소 기준 (임베딩만으로는 다른 주제가 묶이는 것 방지)
const CLUSTER_THRESHOLD = KEYWORD_CLUSTER_THRESHOLD;
const MIN_TOKEN_JACCARD = KEYWORD_MIN_TOKEN_JACCARD;
const MIN_MEMBER_SIMILARITY = 0.88; // 클러스터 멤버 최소 유사도 (대표 대비, 체이닝 방지)
const BATCH_SIZE = 100; // Gemini batchEmbedContents 최대

// ---------------------------------------------------------------
// Gemini API
// ---------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

export async function embedKeywordsForClustering(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`;
    const body = {
      requests: batch.map((text) => ({
        model: `models/${GEMINI_MODEL}`,
        content: {
          parts: [{ text: `task: clustering | query: ${text}` }],
        },
        outputDimensionality: EMBEDDING_DIMS,
      })),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Embedding API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const embeddings = data.embeddings as Array<{ values: number[] }>;
    for (const emb of embeddings) {
      allEmbeddings.push(emb.values);
    }
  }

  return allEmbeddings;
}

// ---------------------------------------------------------------
// Embedding cache (Supabase api_cache)
// ---------------------------------------------------------------

async function loadEmbeddingCache(): Promise<EmbeddingCache> {
  if (!isSupabaseAdminConfigured) return {};

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("api_cache")
    .select("data")
    .eq("key", CACHE_KEY)
    .maybeSingle();

  if (error) throw error;

  if (!data?.data) return {};
  return (data.data as { embeddings: EmbeddingCache }).embeddings ?? {};
}

async function saveEmbeddingCache(cache: EmbeddingCache): Promise<void> {
  if (!isSupabaseAdminConfigured) return;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("api_cache").upsert({
    key: CACHE_KEY,
    data: {
      model: GEMINI_MODEL,
      dimensions: EMBEDDING_DIMS,
      embeddings: cache,
    },
    fetched_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// ---------------------------------------------------------------
// Cosine similarity + Clustering
// ---------------------------------------------------------------

/** 한국어 토큰 추출 (공백 + 조사 제거) */
function extractTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
  return new Set(tokens);
}

/** 공백 차이만 있는 검색어를 판별하기 위한 보수적 정규화 */
function compactWhitespaceVariant(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/** 토큰 Jaccard 유사도 */
export function tokenJaccard(a: string, b: string): number {
  const compactA = compactWhitespaceVariant(a);
  const compactB = compactWhitespaceVariant(b);
  if (compactA.length > 0 && compactA === compactB) return 1;

  const setA = extractTokens(a);
  const setB = extractTokens(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const unionSize = setA.size + setB.size - intersection;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function shouldMergeKeywordPair(
  a: string,
  b: string,
  embeddingA: number[],
  embeddingB: number[],
  threshold = CLUSTER_THRESHOLD,
): { merge: boolean; similarity: number; tokenJaccard: number } {
  const similarity = cosineSimilarity(embeddingA, embeddingB);
  const jaccard = tokenJaccard(a, b);
  return {
    merge: similarity >= threshold && jaccard >= MIN_TOKEN_JACCARD,
    similarity,
    tokenJaccard: jaccard,
  };
}

function calculateGeneralityScores(items: QueryRow[], indices: number[]): Map<number, number> {
  const tokenFrequency = new Map<string, number>();
  const tokensByIndex = new Map<number, Set<string>>();
  for (const index of indices) {
    const tokens = extractTokens(items[index].query);
    tokensByIndex.set(index, tokens);
    for (const token of tokens) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  const scores = new Map<number, number>();
  for (const index of indices) {
    const tokens = tokensByIndex.get(index) ?? new Set<string>();
    if (tokens.size === 0) {
      scores.set(index, 0);
      continue;
    }
    const prevalence = Array.from(tokens).reduce(
      (sum, token) => sum + (tokenFrequency.get(token) ?? 0) / indices.length,
      0,
    );
    scores.set(index, prevalence / tokens.size);
  }
  return scores;
}

function clusterByEmbeddings(
  queries: QueryRow[],
  embeddings: EmbeddingCache,
  threshold: number,
): SemanticCluster[] {
  // Filter to queries that have embeddings
  const items = queries.filter((q) => embeddings[q.query]);

  if (items.length === 0) return [];

  // Union-Find
  const parent = items.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a: number, b: number) {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  }

  // Pairwise cosine similarity + token Jaccard safety check
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const pair = shouldMergeKeywordPair(
        items[i].query,
        items[j].query,
        embeddings[items[i].query],
        embeddings[items[j].query],
        threshold,
      );
      if (pair.merge) {
        union(i, j);
      }
    }
  }

  // Build clusters
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    let arr = clusterMap.get(root);
    if (!arr) {
      arr = [];
      clusterMap.set(root, arr);
    }
    arr.push(i);
  }

  // Aggregate
  const clusters: SemanticCluster[] = [];
  for (const indices of clusterMap.values()) {
    // Centroid 기반 대표 선정 — 클러스터 평균 벡터에 가장 가까운 키워드
    const centroid = new Array<number>(EMBEDDING_DIMS).fill(0);
    for (const idx of indices) {
      const vec = embeddings[items[idx].query];
      for (let d = 0; d < EMBEDDING_DIMS; d++) {
        centroid[d] += vec[d];
      }
    }
    for (let d = 0; d < EMBEDDING_DIMS; d++) {
      centroid[d] /= indices.length;
    }

    const generalityScores = calculateGeneralityScores(items, indices);
    const maxLogImpressions = Math.max(
      1,
      ...indices.map((idx) => Math.log1p(items[idx].impressions)),
    );
    let repIdx = indices[0];
    let maxRepresentativeScore = -1;
    for (const idx of indices) {
      const centroidSimilarity = cosineSimilarity(embeddings[items[idx].query], centroid);
      const normalizedImpressions = Math.log1p(items[idx].impressions) / maxLogImpressions;
      const generality = generalityScores.get(idx) ?? 0;
      const score = centroidSimilarity * 0.6 + normalizedImpressions * 0.25 + generality * 0.15;
      const current = items[idx];
      const representative = items[repIdx];
      if (
        score > maxRepresentativeScore ||
        (score === maxRepresentativeScore && current.impressions > representative.impressions) ||
        (score === maxRepresentativeScore &&
          current.impressions === representative.impressions &&
          current.query.length < representative.query.length)
      ) {
        maxRepresentativeScore = score;
        repIdx = idx;
      }
    }

    const repEmb = embeddings[items[repIdx].query];
    const keywords = indices
      .sort((a, b) => items[b].impressions - items[a].impressions)
      .map((idx) => ({
        ...items[idx],
        similarity:
          idx === repIdx
            ? 1
            : cosineSimilarity(repEmb, embeddings[items[idx].query]),
      }));

    // 체이닝 방지: 대표 대비 유사도가 기준 미달인 멤버는 제거 → 단독 클러스터로 분리
    const kept = keywords.filter((k) => k.similarity >= MIN_MEMBER_SIMILARITY);
    const ejected = keywords.filter((k) => k.similarity < MIN_MEMBER_SIMILARITY);
    for (const ej of ejected) {
      clusters.push({
        representative: ej.query,
        keywords: [{ ...ej, similarity: 1 }],
        impressions: ej.impressions,
        clicks: ej.clicks,
        ctr: ej.ctr,
        position: ej.position,
      });
    }

    // 대표 키워드를 맨 앞으로
    kept.sort((a, b) => (b.similarity === 1 ? 1 : 0) - (a.similarity === 1 ? 1 : 0));

    if (kept.length === 0) continue;

    const totalImpressions = kept.reduce((s, k) => s + k.impressions, 0);
    const totalClicks = kept.reduce((s, k) => s + k.clicks, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const position =
      totalImpressions > 0
        ? kept.reduce((s, k) => s + k.position * k.impressions, 0) / totalImpressions
        : 0;

    clusters.push({
      representative: kept[0].query,
      keywords: kept,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      position: Math.round(position * 10) / 10,
    });
  }

  clusters.sort((a, b) => b.impressions - a.impressions);
  return clusters;
}

/** 품질 평가 도구에서 운영 클러스터링 전체 경로를 재사용합니다. */
export function clusterKeywordQueriesForEvaluation(
  queries: string[],
  embeddings: EmbeddingCache,
  threshold = CLUSTER_THRESHOLD,
  impressions: Record<string, number> = {},
): string[][] {
  const rows: QueryRow[] = queries.map((query) => ({
    query,
    impressions: impressions[query] ?? 1,
    clicks: 0,
    ctr: 0,
    position: 0,
  }));
  return clusterByEmbeddings(rows, embeddings, threshold).map((cluster) =>
    cluster.keywords.map((keyword) => keyword.query),
  );
}

// ---------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------

/**
 * Compute semantic keyword clusters for multiple query groups using one cache cycle.
 * - Loads cached embeddings from Supabase
 * - Deduplicates and embeds new keywords once across all groups
 * - Returns one cluster result per input group
 */
export async function computeSemanticClusterGroups(
  queryGroups: QueryRow[][],
): Promise<Array<SemanticCluster[] | null>> {
  if (!isGeminiConfigured() || !isSupabaseAdminConfigured) {
    return queryGroups.map(() => null);
  }

  try {
    // 1. Load cached embeddings
    const cache = await loadEmbeddingCache();

    // 2. Find new keywords
    const newKeywords = Array.from(
      new Set(queryGroups.flatMap((queries) => queries.map((q) => q.query))),
    )
      .filter((q) => !cache[q]);

    // 3. Embed new keywords if any
    if (newKeywords.length > 0) {
      try {
        const newEmbeddings = await embedKeywordsForClustering(newKeywords);
        for (let i = 0; i < newKeywords.length; i++) {
          cache[newKeywords[i]] = newEmbeddings[i];
        }
        await saveEmbeddingCache(cache);
      } catch (apiErr) {
        // API 실패 시 캐시된 임베딩만으로 클러스터링 진행 (새 키워드는 단독 처리)
        console.warn("[keyword-embeddings] Gemini API failed, using cached embeddings:", apiErr);
      }
    }

    // 4. Cluster (캐시에 있는 키워드만 클러스터링됨)
    return queryGroups.map((queries) => {
      const result = clusterByEmbeddings(queries, cache, CLUSTER_THRESHOLD);
      return result.length > 0 ? result : null;
    });
  } catch (e) {
    console.error("[keyword-embeddings] Failed:", e);
    return queryGroups.map(() => null);
  }
}

export async function computeSemanticClusters(
  queries: QueryRow[],
): Promise<SemanticCluster[] | null> {
  const [result] = await computeSemanticClusterGroups([queries]);
  return result;
}
