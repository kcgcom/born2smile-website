import { BLOG_CATEGORY_SLUGS } from "@/lib/blog";

const HISTORY_KEY = "blogListPosition";
const RETURN_KEY = "born2smile_blog_return";
const PENDING_KEY = "born2smile_blog_restore";

export interface ListPosition {
  url: string;
  count: number;
  y: number;
}

function validPosition(value: unknown): value is ListPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as ListPosition;
  if (typeof position.url !== "string" || !position.url.startsWith("/blog")) return false;
  const url = new URL(position.url, window.location.origin);
  return url.origin === window.location.origin
    && (url.pathname === "/blog" || BLOG_CATEGORY_SLUGS.some((slug) => url.pathname === `/blog/${slug}`))
    && Number.isInteger(position.count) && position.count >= 12
    && Number.isFinite(position.y) && position.y >= 0;
}

export function saveListPosition(postPath: string, count: number) {
  const position: ListPosition = {
    url: window.location.pathname + window.location.search,
    count,
    y: window.scrollY,
  };
  window.history.replaceState({ ...window.history.state, [HISTORY_KEY]: position }, "");
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ postPath, position }));
  } catch { /* Storage may be disabled; browser back still uses history state. */ }
}

export function readListPosition(): ListPosition | null {
  let pending: unknown;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  const currentUrl = window.location.pathname + window.location.search;
  const position = validPosition(pending) ? pending : window.history.state?.[HISTORY_KEY];
  return validPosition(position) && position.url === currentUrl ? position : null;
}

export function prepareListReturn(): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null");
    if (saved?.postPath !== window.location.pathname || !validPosition(saved.position)) return null;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(saved.position));
    return saved.position.url;
  } catch {
    return null;
  }
}
