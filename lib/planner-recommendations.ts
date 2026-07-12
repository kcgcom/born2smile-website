export interface RecommendationCandidate {
  key: string;
  itemType: "blog" | "page" | "faq";
  title: string;
  valueScore: number;
  effortMinutes: number;
  topicKeys: string[];
}

function topicsOverlap(a: RecommendationCandidate, b: RecommendationCandidate): boolean {
  const bTopics = new Set(b.topicKeys);
  return a.topicKeys.some((topicKey) => bTopics.has(topicKey));
}

function pageBlogConflict(a: RecommendationCandidate, b: RecommendationCandidate): boolean {
  const types = new Set([a.itemType, b.itemType]);
  return types.has("page") && types.has("blog") && topicsOverlap(a, b);
}

function compareCandidates(a: RecommendationCandidate, b: RecommendationCandidate): number {
  return b.valueScore - a.valueScore
    || a.effortMinutes - b.effortMinutes
    || a.title.localeCompare(b.title, "ko");
}

export function getSuppressedBlogCandidateCount<T extends RecommendationCandidate>(
  candidates: T[],
  requestedOpportunityKey: string | null,
  blockedBlogTopicKeys: Set<string>,
): number {
  const pageCandidates = candidates.filter((candidate) => candidate.itemType === "page");
  return candidates.filter((candidate) => {
    if (candidate.itemType !== "blog" || candidate.key === requestedOpportunityKey) return false;
    return candidate.topicKeys.some((topicKey) => blockedBlogTopicKeys.has(topicKey))
      || pageCandidates.some((page) => pageBlogConflict(candidate, page));
  }).length;
}

export function selectBalancedRecommendations<T extends RecommendationCandidate>(
  candidates: T[],
  requestedOpportunityKey: string | null,
  blockedBlogTopicKeys: Set<string>,
  limit = 5,
): T[] {
  const sorted = [...candidates].sort(compareCandidates);
  const requested = sorted.find((candidate) => candidate.key === requestedOpportunityKey);
  const selected = requested ? [requested] : [];
  const pageCandidates = sorted.filter((candidate) => candidate.itemType === "page");
  let remaining = sorted.filter((candidate) => {
    if (candidate.key === requested?.key) return false;
    if (requested && pageBlogConflict(candidate, requested)) return false;
    if (candidate.itemType !== "blog") return true;
    if (pageCandidates.some((page) => pageBlogConflict(candidate, page))) return false;
    return !candidate.topicKeys.some((topicKey) => blockedBlogTopicKeys.has(topicKey));
  });

  while (selected.length < limit && remaining.length > 0) {
    const top = remaining[0];
    const sameTypeCount = selected.filter((candidate) => candidate.itemType === top.itemType).length;
    let index = sameTypeCount >= 3
      ? remaining.findIndex((candidate) => candidate.itemType !== top.itemType && top.valueScore - candidate.valueScore <= 10)
      : -1;
    if (index < 0 && remaining[1] && top.valueScore - remaining[1].valueScore <= 10 && remaining[1].effortMinutes < top.effortMinutes) index = 1;
    if (index < 0) index = 0;
    const [chosen] = remaining.splice(index, 1);
    selected.push(chosen);
    remaining = remaining.filter((candidate) => !pageBlogConflict(candidate, chosen));
  }

  return selected;
}
