import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { hasAdminBrowserFlag, isInternalAnalyticsPath } from "@/lib/admin-visitor";
import { sanitizeCardEventProperties } from "@/lib/blog/card-tracking";
import { isPerformanceAudit } from "@/lib/performance-audit";
import { getClientSentryOptions } from "@/sentry-options";

Sentry.init(getClientSentryOptions());

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const POSTHOG_UI_HOST = resolvePostHogUiHost(
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
  POSTHOG_HOST,
);
let lastCapturedPageviewId: string | undefined;

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
  if (isPerformanceAudit(window.location.search)) return true;
  return isInternalAnalyticsPath(window.location.pathname) || hasAdminBrowserFlag();
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
    // 이 프로젝트는 수동 이벤트/페이지뷰만 사용하므로 외부 확장 로딩을 전부 끈다.
    disable_surveys: true,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    before_send: (event) => {
      if (shouldBlockAnalytics()) {
        return null;
      }

      // The SDK assigns an ID even to pageviews discarded by before_send.
      if (event?.event === "$pageleave" && (
        !lastCapturedPageviewId || event.properties?.$prev_pageview_id !== lastCapturedPageviewId
      )) {
        return null;
      }

      if (event?.event === "$pageview") {
        const pageviewId = event.properties?.$pageview_id;
        lastCapturedPageviewId = typeof pageviewId === "string" ? pageviewId : undefined;
        return {
          ...event,
          properties: {
            ...event.properties,
            crypto_random_uuid_supported: typeof window.crypto?.randomUUID === "function",
          },
        };
      }
      if (event?.event === "blog_card_impression" || event?.event === "blog_card_clicked") {
        return { ...event, properties: sanitizeCardEventProperties(event.properties ?? {}) };
      }
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
