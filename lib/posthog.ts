"use client";

import posthog from "posthog-js";
import { getAnalyticsPage, getContactChannel } from "@/lib/analytics-events";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const hasPostHogConfig = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function shouldSkipCapture() {
  if (typeof window === "undefined") return true;

  try {
    return (
      window.location.pathname.startsWith("/admin") ||
      window.location.pathname.startsWith("/api") ||
      localStorage.getItem("born2smile-admin") === "1" ||
      posthog.has_opted_out_capturing()
    );
  } catch {
    return true;
  }
}

let articleContext: (() => AnalyticsProps | null) | null = null;

export function registerArticleAnalytics(read: () => AnalyticsProps | null) {
  articleContext = read;
  return () => { if (articleContext === read) articleContext = null; };
}

export function getAnalyticsSessionId(): string | null {
  if (!hasPostHogConfig || shouldSkipCapture()) return null;
  try { return posthog.get_session_id() ?? null; } catch { return null; }
}

export function captureReadingEvent(event: string, properties: AnalyticsProps): boolean {
  if (!hasPostHogConfig || shouldSkipCapture()) return false;
  try { return Boolean(posthog.capture(event, compactProperties(properties))); } catch { return false; }
}

function compactProperties(properties: AnalyticsProps) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

export function captureEvent(event: string, properties: AnalyticsProps = {}, options: { ga4?: boolean } = {}) {
  if (shouldSkipCapture()) return false;

  const page = getAnalyticsPage(window.location.pathname);
  const compacted = compactProperties({
    ...properties,
    ...page,
    // List reactions target another post, not the current page.
    ...(properties.blog_slug ? { blog_slug: properties.blog_slug } : {}),
    contact_channel: getContactChannel(event),
  });

  let submitted = false;
  if (hasPostHogConfig) {
    try {
      const context = properties.surface !== "list_card" && page.page_type === "blog_post"
        && (!properties.blog_slug || properties.blog_slug === page.blog_slug) ? articleContext?.() : null;
      submitted = Boolean(posthog.capture(event, { ...compacted, ...context }));
    } catch { /* Analytics must not interrupt a click or a successful RPC. */ }
  }

  if (options.ga4 !== false && typeof window.gtag === "function") {
    try { window.gtag("event", event, compacted); submitted = true; } catch { /* Optional provider. */ }
  }
  return submitted;
}
