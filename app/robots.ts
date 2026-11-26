export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/staff", "/api/", "/review"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // AI 크롤러 명시적 허용
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "GoogleOther",
          "Google-Extended",
          "Applebot-Extended",
          "cohere-ai",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
