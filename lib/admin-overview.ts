export const MIN_REVIEW_RESPONSES = 5;
export const MIN_UNRESOLVED_RESPONSES = 3;
export const OVERVIEW_WINDOW_DAYS = 14;
export const MIN_PREVIOUS_SEARCH_CLICKS = 10;
export const MIN_SEARCH_CLICK_DROP = 5;
export const MIN_SEARCH_DROP_PERCENT = 30;

export interface SearchPageCounts { page: string; clicks: number; impressions: number }
export interface SearchReviewItem { page: string; clicks: number; previousClicks: number; drop: number; changePercent: number }
export function searchReviewCandidates(current: SearchPageCounts[], previous: SearchPageCounts[]): SearchReviewItem[] {
  const previousByPage = new Map(previous.map(row => [row.page, row]));
  return current.flatMap(row => {
    const prior = previousByPage.get(row.page);
    if (!prior || prior.clicks < MIN_PREVIOUS_SEARCH_CLICKS) return [];
    const drop = prior.clicks - row.clicks;
    const changePercent = (row.clicks - prior.clicks) / prior.clicks * 100;
    return drop >= MIN_SEARCH_CLICK_DROP && changePercent <= -MIN_SEARCH_DROP_PERCENT
      ? [{ page: row.page, clicks: row.clicks, previousClicks: prior.clicks, drop, changePercent }] : [];
  }).sort((a, b) => b.drop - a.drop || a.page.localeCompare(b.page));
}

export interface SearchAttention {
  configured: boolean;
  start: string; end: string; previousStart: string; previousEnd: string;
  fetchedAt: string;
  truncated: boolean;
  items: SearchReviewItem[];
}

interface OverviewPost { slug: string; title: string; published: boolean; date: string }
interface Responses { solved: number; unresolved: number; total: number }

export function overviewContent(posts: OverviewPost[], feedback: Record<string, Responses>, today: string) {
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + OVERVIEW_WINDOW_DAYS * 86400_000).toISOString().slice(0, 10);
  const drafts = posts.filter(post => !post.published);
  const scheduled = posts.filter(post => post.published && post.date > today && post.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  const review = posts.filter(post => post.published && post.date <= today && post.date !== "")
    .flatMap(post => {
      const responses = feedback[post.slug];
      return responses && responses.total >= MIN_REVIEW_RESPONSES && responses.unresolved >= MIN_UNRESOLVED_RESPONSES
        ? [{ ...post, responses }] : [];
    }).sort((a, b) => b.responses.unresolved - a.responses.unresolved || b.responses.total - a.responses.total || a.slug.localeCompare(b.slug));
  return { drafts, scheduled, review, end };
}
