"use client";

import posthog from "posthog-js";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const hasPostHogConfig = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
);

function shouldSkipCapture() {
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

function compactProperties(properties: AnalyticsProps) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );
}

export function captureEvent(event: string, properties: AnalyticsProps = {}) {
  if (!hasPostHogConfig || shouldSkipCapture()) return;

  posthog.capture(event, compactProperties({
    page_path: window.location.pathname,
    ...properties,
  }));
}
