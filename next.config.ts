import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function getCspOrigins(...values: Array<string | undefined>) {
  return Array.from(new Set(values.flatMap((value) => {
    if (!value) return [];

    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  })));
}

const posthogConnectSrc = getCspOrigins(
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  process.env.POSTHOG_BASE_URL,
);

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://dapi.kakao.com https://t1.daumcdn.net https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://static.cloudflareinsights.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline' https://*.i.posthog.com",
  "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakaocdn.net",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://www.googleapis.com",
    "https://dapi.kakao.com",
    "https://www.google-analytics.com",
    "https://static.cloudflareinsights.com",
    "https://*.i.posthog.com",
    "https://*.posthog.com",
    "https://us.posthog.com",
    "https://eu.posthog.com",
    ...posthogConnectSrc,
  ].join(" "),
  "font-src 'self'",
  "frame-src 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    minimumCacheTTL: 31536000, // 1년 — 정적 이미지 재방문 캐시 효율 극대화
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(
  withBundleAnalyzer(nextConfig),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
    },
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
      automaticVercelMonitors: Boolean(process.env.SENTRY_AUTH_TOKEN),
    },
  },
);
