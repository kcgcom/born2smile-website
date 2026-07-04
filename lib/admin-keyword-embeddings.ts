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

type EmbeddingCache = Record<string, number[]>; // query → vector

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

const GEMINI_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMS = 256; // MRL로 축소 — 저장 효율적
const CACHE_KEY = "keyword-embeddings";
const CLUSTER_THRESHOLD = 0.88; // 코사인 유사도 임계값 (0.82에서 상향 — 치과 도메인 오병합 방지)
const MIN_TOKEN_JACCARD = 0.3; // 토큰 겹침 최소 기준 (임베딩만으로는 다른 주제가 묶이는 것 방지)
const BATCH_SIZE = 100; // Gemini batchEmbedContents 최대

// ---------------------------------------------------------------
// Gemini API
// ---------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

async function batchEmbed(texts: string[]): Promise<number[][]> {
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
        content: { parts: [{ text }] },
        taskType: "CLUSTERING",
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
  const { data } = await admin
    .from("api_cache")
    .select("data")
    .eq("key", CACHE_KEY)
    .single();

  if (!data?.data) return {};
  return (data.data as { embeddings: EmbeddingCache }).embeddings ?? {};
}

async function saveEmbeddingCache(cache: EmbeddingCache): Promise<void> {
  if (!isSupabaseAdminConfigured) return;

  const admin = getSupabaseAdmin();
  await admin.from("api_cache").upsert({
    key: CACHE_KEY,
    data: { embeddings: cache },
    fetched_at: new Date().toISOString(),
  });
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

/** 토큰 Jaccard 유사도 */
function tokenJaccard(a: string, b: string): number {
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

function cosineSimilarity(a: number[], b: number[]): number {
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
      const sim = cosineSimilarity(
        embeddings[items[i].query],
        embeddings[items[j].query],
      );
      if (sim >= threshold) {
        // 토큰 겹침이 최소 기준 미달이면 병합하지 않음
        const jaccard = tokenJaccard(items[i].query, items[j].query);
        if (jaccard >= MIN_TOKEN_JACCARD) {
          union(i, j);
        }
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

    let repIdx = indices[0];
    let maxSimToCentroid = -1;
    for (const idx of indices) {
      const sim = cosineSimilarity(embeddings[items[idx].query], centroid);
      if (sim > maxSimToCentroid) {
        maxSimToCentroid = sim;
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
    // 대표 키워드를 맨 앞으로
    keywords.sort((a, b) => (b.similarity === 1 ? 1 : 0) - (a.similarity === 1 ? 1 : 0));

    const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0);
    const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const position =
      totalImpressions > 0
        ? keywords.reduce((s, k) => s + k.position * k.impressions, 0) / totalImpressions
        : 0;

    clusters.push({
      representative: keywords[0].query,
      keywords,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      position: Math.round(position * 10) / 10,
    });
  }

  clusters.sort((a, b) => b.impressions - a.impressions);
  return clusters;
}

// ---------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------

/**
 * Compute semantic keyword clusters using Gemini embeddings.
 * - Loads cached embeddings from Supabase
 * - Only embeds new keywords via Gemini API
 * - Returns clusters or null if Gemini is not configured
 */
export async function computeSemanticClusters(
  queries: QueryRow[],
): Promise<SemanticCluster[] | null> {
  if (!isGeminiConfigured() || !isSupabaseAdminConfigured) {
    return null;
  }

  try {
    // 1. Load cached embeddings
    const cache = await loadEmbeddingCache();

    // 2. Find new keywords
    const newKeywords = queries
      .map((q) => q.query)
      .filter((q) => !cache[q]);

    // 3. Embed new keywords if any
    if (newKeywords.length > 0) {
      const newEmbeddings = await batchEmbed(newKeywords);
      for (let i = 0; i < newKeywords.length; i++) {
        cache[newKeywords[i]] = newEmbeddings[i];
      }
      // Save updated cache
      await saveEmbeddingCache(cache);
    }

    // 4. Cluster
    return clusterByEmbeddings(queries, cache, CLUSTER_THRESHOLD);
  } catch (e) {
    console.error("[keyword-embeddings] Failed:", e);
    return null;
  }
}
