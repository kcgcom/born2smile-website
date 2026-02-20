"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Share2, Check } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { shareUrl } from "@/lib/share";

interface BlogShareButtonProps {
  slug: string;
  title: string;
}

export default function BlogShareButton({
  slug,
  title,
}: BlogShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    const result = await shareUrl(`${BASE_URL}/blog/${slug}`, title);
    if (result === "copied") {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [slug, title]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
