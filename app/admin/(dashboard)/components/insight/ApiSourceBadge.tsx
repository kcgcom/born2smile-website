"use client";

import { ExternalLink } from "lucide-react";

interface ApiSource {
  name: string;
  url: string;
}

const API_SOURCES: Record<string, ApiSource> = {
  ga4: {
    name: "Google Analytics 4",
    url: "https://analytics.google.com/",
  },
  searchConsole: {
    name: "Google Search Console",
    url: "https://search.google.com/search-console",
  },
  naverDatalab: {
    name: "Naver DataLab",
    url: "https://datalab.naver.com/",
  },
  naverSearchAd: {
    name: "Naver 검색광고",
    url: "https://searchad.naver.com/",
  },
};

type ApiSourceKey = keyof typeof API_SOURCES;

interface ApiSourceBadgeProps {
  sources: ApiSourceKey[];
}

export function ApiSourceBadge({ sources }: ApiSourceBadgeProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
      <span className="shrink-0 font-medium">데이터 소스:</span>
      {sources.map((key) => {
        const src = API_SOURCES[key];
        return (
          <a
            key={key}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
          >
            {src.name}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
