/**
 * Keyword clustering using a hybrid similarity approach:
 *   1. Exact match after space removal
 *   2. Token Jaccard (stopwords removed) — catches "레진 치료 후 식사" ≈ "레진하고 식사"
 *   3. Jaro-Winkler distance — catches typos and minor variations
 * If EITHER score exceeds the threshold, keywords are merged.
 */

export type QueryRow = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type ClusterMember = QueryRow & {
  /** Combined similarity to the representative keyword (1.0 for the representative itself) */
  similarity: number;
};

export type KeywordCluster = {
  /** Highest-impression keyword as the group label */
  representative: string;
  /** All keywords in this cluster, sorted by impressions desc, with similarity scores */
  keywords: ClusterMember[];
  /** Aggregated metrics */
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

// ---------------------------------------------------------------
// Korean stopwords — function words, particles, connectors
// Sorted longest-first to avoid partial replacement issues
// ---------------------------------------------------------------

const STOPWORDS = new Set([
  "하고", "에서", "으로", "해서", "할때", "하면", "때문", "대해",
  "에", "후", "전", "때", "할", "한", "는", "은", "이", "가",
  "을", "를", "의", "와", "과", "도", "로", "및", "더", "좀",
  "잘", "못", "안", "꼭", "다", "수",
]);

// ---------------------------------------------------------------
// Similarity algorithms
// ---------------------------------------------------------------

/** Remove spaces */
function normalize(keyword: string): string {
  return keyword.replace(/\s+/g, "");
}

/** Extract meaningful tokens (remove single-char particles and stopwords) */
function extractTokens(keyword: string): Set<string> {
  const tokens = keyword.split(/\s+/).filter((t) => t.length > 0);
  const result = new Set<string>();
  for (const token of tokens) {
    if (token.length === 1 && STOPWORDS.has(token)) continue;
    if (STOPWORDS.has(token)) continue;
    result.add(token);
  }
  // Also handle compound words: split tokens > 3 chars into 2-char substrings
  // to catch "레진치료" matching "레진" + "치료"
  for (const token of tokens) {
    if (token.length >= 4 && !STOPWORDS.has(token)) {
      for (let i = 0; i < token.length - 1; i += 2) {
        const sub = token.slice(i, i + 2);
        if (sub.length === 2) result.add(sub);
      }
    }
  }
  return result;
}

/** Jaccard similarity between two token sets */
function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** Jaro similarity (base for Jaro-Winkler) */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  );
}

/** Jaro-Winkler similarity (boosts score for common prefix) */
function jaroWinkler(s1: string, s2: string): number {
  const jaroScore = jaro(s1, s2);
  if (jaroScore === 0) return 0;

  // Common prefix length (max 4)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  // Winkler scaling factor p = 0.1
  return jaroScore + prefix * 0.1 * (1 - jaroScore);
}

/** Combined hybrid similarity: max(tokenJaccard, jaroWinkler on normalized) */
function hybridSimilarity(
  tokensA: Set<string>,
  tokensB: Set<string>,
  normA: string,
  normB: string,
): number {
  const tj = tokenJaccard(tokensA, tokensB);
  const jw = jaroWinkler(normA, normB);
  return Math.max(tj, jw);
}

// ---------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------

/**
 * Cluster similar keywords using hybrid similarity + Union-Find.
 * @param queries  — flat list of query rows from Search Console
 * @param threshold — minimum similarity to merge (0–1, default 0.55)
 */
export function clusterKeywords(
  queries: QueryRow[],
  threshold = 0.55,
): KeywordCluster[] {
  if (queries.length === 0) return [];

  // Pre-compute normalized forms and tokens
  const items = queries.map((q) => {
    const norm = normalize(q.query);
    const tokens = extractTokens(q.query);
    return { row: q, norm, tokens };
  });

  // --- Union-Find ---
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

  // Pass 1: exact match after space-removal
  const normMap = new Map<string, number>();
  for (let i = 0; i < items.length; i++) {
    const existing = normMap.get(items[i].norm);
    if (existing !== undefined) {
      union(i, existing);
    } else {
      normMap.set(items[i].norm, i);
    }
  }

  // Pass 2: hybrid similarity (compare unique norm groups only)
  const reps = Array.from(normMap.entries());
  for (let i = 0; i < reps.length; i++) {
    for (let j = i + 1; j < reps.length; j++) {
      const idxA = reps[i][1];
      const idxB = reps[j][1];
      const sim = hybridSimilarity(
        items[idxA].tokens,
        items[idxB].tokens,
        items[idxA].norm,
        items[idxB].norm,
      );
      if (sim >= threshold) {
        union(idxA, idxB);
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

  // Aggregate metrics per cluster, compute similarity to representative
  const clusters: KeywordCluster[] = [];
  for (const indices of clusterMap.values()) {
    indices.sort((a, b) => items[b].row.impressions - items[a].row.impressions);
    const repIdx = indices[0];

    const members: ClusterMember[] = indices.map((idx) => ({
      ...items[idx].row,
      similarity:
        idx === repIdx
          ? 1
          : hybridSimilarity(
              items[repIdx].tokens,
              items[idx].tokens,
              items[repIdx].norm,
              items[idx].norm,
            ),
    }));

    const totalImpressions = members.reduce((s, k) => s + k.impressions, 0);
    const totalClicks = members.reduce((s, k) => s + k.clicks, 0);
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const position =
      totalImpressions > 0
        ? members.reduce((s, k) => s + k.position * k.impressions, 0) /
          totalImpressions
        : 0;

    clusters.push({
      representative: members[0].query,
      keywords: members,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      position: Math.round(position * 10) / 10,
    });
  }

  clusters.sort((a, b) => b.impressions - a.impressions);
  return clusters;
}
