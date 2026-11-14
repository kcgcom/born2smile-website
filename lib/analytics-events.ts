import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";

export const PHONE_EVENTS = [
  "hero_phone_click", "cta_phone_click", "contact_phone_click",
  "header_phone_click", "floating_phone_click", "footer_phone_click",
] as const;
export const KAKAO_EVENTS = ["contact_kakao_click", "footer_kakao_channel_click"] as const;
export const CONTACT_NAVIGATION_EVENTS = [
  "hero_contact_click", "cta_contact_click", "floating_contact_nav_click",
] as const;
export const CTA_EVENTS = [...PHONE_EVENTS, ...KAKAO_EVENTS, ...CONTACT_NAVIGATION_EVENTS] as const;

export function getAnalyticsPage(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const match = path.match(/^\/blog\/([^/]+)\/([^/]+)$/);
  if (match && (BLOG_CATEGORY_SLUGS as readonly string[]).includes(match[1])) {
    return { page_path: path, page_type: "blog_post", blog_slug: match[2], category: match[1] };
  }
  const pageType = path === "/" ? "home"
    : path.startsWith("/blog") ? "blog_list"
    : path.startsWith("/treatments") ? "treatment"
    : path === "/about" ? "about" : path === "/contact" ? "contact" : "other";
  return { page_path: path, page_type: pageType };
}

export function getContactChannel(event: string) {
  if ((PHONE_EVENTS as readonly string[]).includes(event)) return "phone";
  if ((KAKAO_EVENTS as readonly string[]).includes(event)) return "kakao";
  if ((CONTACT_NAVIGATION_EVENTS as readonly string[]).includes(event)) return "navigation";
  return undefined;
}
