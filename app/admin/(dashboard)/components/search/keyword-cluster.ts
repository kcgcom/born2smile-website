/**
 * Keyword clustering using character bigram Dice coefficient.
 * Groups similar search queries (e.g. "레진 치료 후 식사" ≈ "레진치료 후 식사")
 * without requiring a Korean morphological analyzer.
 */

export type QueryRow = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type ClusterMember = QueryRow & {
  /** Dice similarity to the representative keyword (1.0 for the representative itself) */
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

/** Generate character bigrams from a string */
function bigrams(s: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

/** Dice coefficient between two bigram sets (0–1) */
function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const bg of a) {
    if (b.has(bg)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/** Remove spaces for normalization */
function normalize(keyword: string): string {
  return keyword.replace(/\s+/g, "");
}

/**
 * Cluster similar keywords using character bigram Dice coefficient + Union-Find.
 * @param queries  — flat list of query rows from Search Console
 * @param threshold — minimum Dice similarity to merge (0–1, default 0.55)
 */
export function clusterKeywords(
  queries: QueryRow[],
  threshold = 0.55,
): KeywordCluster[] {
  if (queries.length === 0) return [];

  // Pre-compute normalized forms and bigrams
  const items = queries.map((q) => {
    const norm = normalize(q.query);
    return { row: q, norm, bgs: bigrams(norm) };
  });

  // --- Union-Find ---
  const parent = items.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]; // path compression
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

  // Pass 2: fuzzy merge via Dice coefficient (compare unique norm groups only)
  const reps = Array.from(normMap.entries()); // [norm, index]
  for (let i = 0; i < reps.length; i++) {
    for (let j = i + 1; j < reps.length; j++) {
      const sim = diceSimilarity(items[reps[i][1]].bgs, items[reps[j][1]].bgs);
      if (sim >= threshold) {
        union(reps[i][1], reps[j][1]);
      }
    }
  }

  // Build clusters (with index tracking for similarity computation)
  const clusterMap = new Map<number, number[]>(); // root → item indices
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
    // Sort by impressions desc — first becomes representative
    indices.sort((a, b) => items[b].row.impressions - items[a].row.impressions);
    const repIdx = indices[0];
    const repBgs = items[repIdx].bgs;

    const members: ClusterMember[] = indices.map((idx) => ({
      ...items[idx].row,
      similarity:
        idx === repIdx ? 1 : diceSimilarity(repBgs, items[idx].bgs),
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
