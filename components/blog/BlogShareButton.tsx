"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Share2, Check } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { shareUrl } from "@/lib/share";
import { getBlogPostUrl } from "@/lib/blog";
import type { BlogCategoryValue } from "@/lib/blog/types";
import { captureEvent } from "@/lib/posthog";

interface BlogShareButtonProps {
  slug: string;
  title: string;
  category: BlogCategoryValue;
  source?: string;
}

export default function BlogShareButton({
  slug,
  title,
  category,
  source = "unknown",
}: BlogShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    const result = await shareUrl(`${BASE_URL}${getBlogPostUrl(slug, category)}`, title);

    if (result !== "failed") {
      captureEvent("blog_post_shared", {
        blog_slug: slug,
        category,
        source,
        method: result,
      });
    }

    if (result === "copied") {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [slug, title, category, source]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-[var(--color-primary)]/20 hover:bg-blue-50/70 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
      aria-label="이 글 공유하기"
    >
      {copied ? (
        <>
          <Check size={17} className="text-green-500" />
          <span className="text-green-600">링크 복사됨</span>
        </>
      ) : (
        <>
          <Share2 size={17} />
          <span>공유하기</span>
        </>
      )}
    </button>
  );
}
