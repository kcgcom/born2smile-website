import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://dapi.kakao.com https://t1.daumcdn.net https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakaocdn.net",
  "connect-src 'self' https://*.supabase.co https://accounts.google.com https://apis.google.com https://www.googleapis.com https://dapi.kakao.com https://www.google-analytics.com https://static.cloudflareinsights.com",
  "font-src 'self'",
  "frame-src 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
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

export default nextConfig;
