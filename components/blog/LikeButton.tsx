"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart } from "lucide-react";
import { captureEvent } from "@/lib/posthog";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

const USER_ID_KEY = "born2smile_uid";
const LIKE_COOLDOWN_MS = 1000;

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
}

interface LikeButtonProps {
  slug: string;
  source?: string;
}

export default function LikeButton({ slug, source = "unknown" }: LikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [unavailable, setUnavailable] = useState(!isSupabaseConfigured);
  const [coolingDown, setCoolingDown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  // Supabase에서 좋아요 데이터 로드
  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[LikeButton] NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. " +
          ".env.local 파일에 Supabase 설정을 추가하세요."
        );
      }
      return;
    }

    const uid = getUserId();
    const supabase = getSupabaseBrowserClient();

    supabase.rpc("get_like", { p_slug: slug })
      .then(({ data, error }: { data: Array<{ like_count: number; like_users: string[] }> | null; error: unknown }) => {
        if (!error && data && data.length > 0) {
          setCount(data[0].like_count ?? 0);
          setLiked((data[0].like_users as string[])?.includes(uid) ?? false);
        }
      })
      .catch((error: unknown) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[LikeButton] Supabase 연결 실패:", error);
        }
        setUnavailable(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleToggle = useCallback(async () => {
    if (loading || unavailable || coolingDown) return;

    const uid = getUserId();
    if (!uid) return;

    setCoolingDown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setCoolingDown(false);
      cooldownTimerRef.current = null;
    }, LIKE_COOLDOWN_MS);

    // 낙관적 업데이트
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((prev) => prev + (wasLiked ? -1 : 1));

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc("toggle_like", { p_slug: slug, p_user_id: uid });
      if (error) throw error;

      captureEvent("blog_post_like_toggled", {
        blog_slug: slug,
        source,
        action: wasLiked ? "unlike" : "like",
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[LikeButton] 좋아요 저장 실패:", error);
      }
      // 실패 시 롤백
      setLiked(wasLiked);
      setCount((prev) => prev + (wasLiked ? 1 : -1));
    }
  }, [slug, liked, loading, unavailable, coolingDown, source]);

  if (unavailable) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-300 shadow-sm cursor-not-allowed"
        aria-label="좋아요 기능을 사용할 수 없습니다"
        title="좋아요 기능 준비 중"
      >
        <Heart size={17} />
        <span>공감해요</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || coolingDown}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 ${
        liked
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600"
      } ${(loading || coolingDown) ? "opacity-50" : ""}`}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
    >
      <Heart
        size={17}
        className={`transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`}
      />
      <span>{count > 0 ? `${count}명 공감` : "공감해요"}</span>
    </button>
  );
}
