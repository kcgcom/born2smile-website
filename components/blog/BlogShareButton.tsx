"use client";

import { useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";
import { BASE_URL } from "@/lib/constants";

interface BlogShareButtonProps {
  slug: string;
  title: string;
}

export default function BlogShareButton({
  slug,
  title,
}: BlogShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `${BASE_URL}/blog/${slug}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [slug, title]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      aria-label="이 글 공유하기"
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-500" />
          <span className="text-green-600">링크 복사됨</span>
        </>
      ) : (
        <>
          <Share2 size={16} />
          공유
        </>
      )}
    </button>
  );
}
