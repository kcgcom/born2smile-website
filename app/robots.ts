import type { MetadataRoute } from "next";

// TODO: 실제 도메인으로 교체
const BASE_URL = "https://www.born2smile.co.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
