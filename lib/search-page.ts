/** Keep the original URL as the row identity; derive only labels from its path. */
export function getSearchPagePath(page: string): string {
  try {
    return new URL(page).pathname;
  } catch {
    return page.split(/[?#]/)[0];
  }
}

export function getSearchPageLabel(page: string): string {
  const path = getSearchPagePath(page);
  const labels: Record<string, string> = { "/": "홈페이지", "/about": "병원 소개", "/contact": "상담 안내", "/treatments": "진료 안내" };
  return labels[path] ?? path;
}

/** Scheme, host and query distinguish Search Console rows and drilldown keys. */
export function getSearchPageIdentity(page: string): string {
  try {
    return new URL(page).href;
  } catch {
    return page;
  }
}
