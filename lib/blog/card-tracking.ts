import { getAnalyticsPage } from "@/lib/analytics-events";

export const CARD_MEASUREMENT_VERSION = "blog_card_v1";
export function sanitizeCardEventProperties(properties: Record<string, unknown>) {
  const sanitized = { ...properties };
  for (const key of ["$current_url", "$referrer", "$session_entry_url", "$session_entry_referrer", "$initial_current_url", "$initial_referrer"]) {
    const value = sanitized[key];
    if (typeof value !== "string" || !value) continue;
    try {
      const url = new URL(value);
      sanitized[key] = url.origin + url.pathname;
    } catch { sanitized[key] = null; }
  }
  return sanitized;
}
export type BlogCardSurface = "listing" | "category_questions" | "category_curated" | "category_list" | "related_auto" | "related_manual";

export function blogCardAttributes(href: string, surface: BlogCardSurface, position: number, group = "main") {
  // Only canonical internal blog destinations; external references are not recommendations.
  if (!href.startsWith("/blog/") || href.includes("?") || href.includes("#")) return {};
  const page = getAnalyticsPage(href);
  if (page.page_type !== "blog_post") return {};
  return {
    "data-blog-card": page.blog_slug,
    "data-card-category": page.category,
    "data-card-surface": surface,
    "data-card-position": position,
    "data-card-group": group,
    "data-card-href": href,
  };
}

export function visibleCardRatio(rect: { left: number; right: number; top: number; bottom: number; width: number; height: number }, width: number, height: number) {
  const area = rect.width * rect.height;
  if (area <= 0) return 0;
  return Math.max(0, Math.min(width, rect.right) - Math.max(0, rect.left))
    * Math.max(0, Math.min(height, rect.bottom) - Math.max(0, rect.top)) / area;
}
