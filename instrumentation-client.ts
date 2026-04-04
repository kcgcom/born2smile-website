import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const POSTHOG_UI_HOST = resolvePostHogUiHost(
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
  POSTHOG_HOST,
);

function resolvePostHogUiHost(
  explicitUiHost: string | undefined,
  apiHost: string | undefined,
) {
  if (explicitUiHost) return explicitUiHost;
  if (!apiHost) return undefined;

  if (apiHost.includes("us.i.posthog.com")) return "https://us.posthog.com";
  if (apiHost.includes("eu.i.posthog.com")) return "https://eu.posthog.com";

  return undefined;
}

function shouldBlockAnalytics() {
  if (typeof window === "undefined") return true;

  try {
    return (
      window.location.pathname.startsWith("/admin") ||
      localStorage.getItem("born2smile-admin") === "1"
    );
  } catch {
    return window.location.pathname.startsWith("/admin");
  }
}

if (typeof window !== "undefined" && POSTHOG_TOKEN && POSTHOG_HOST) {
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: "if_capture_pageview",
    autocapture: false,
    disable_session_recording: true,
    before_send: (event) => {
      if (shouldBlockAnalytics()) {
        return null;
      }

      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
