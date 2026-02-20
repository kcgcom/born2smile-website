"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction,
} from "firebase/firestore";

const USER_ID_KEY = "born2smile_uid";

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
}

export default function LikeButton({ slug }: LikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [unavailable, setUnavailable] = useState(!isFirebaseConfigured);

  // Firestore에서 좋아요 데이터 로드
  useEffect(() => {
    if (!isFirebaseConfigured) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[LikeButton] NEXT_PUBLIC_FIREBASE_API_KEY가 설정되지 않았습니다. " +
          ".env.local 파일에 Firebase API 키를 추가하세요."
        );
      }
      return;
    }

    const uid = getUserId();
    const docRef = doc(db, "blog-likes", slug);

    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCount(data.count ?? 0);
          setLiked((data.users as string[])?.includes(uid) ?? false);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[LikeButton] Firestore 연결 실패:", error);
        }
        setUnavailable(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleToggle = useCallback(async () => {
    if (loading || unavailable) return;

    const uid = getUserId();
    if (!uid) return;

    // 낙관적 업데이트
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((prev) => prev + (wasLiked ? -1 : 1));

    try {
      const docRef = doc(db, "blog-likes", slug);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        const data = snap.exists()
          ? snap.data()
          : { count: 0, users: [] };
        const users: string[] = data.users ?? [];
        const currentCount: number = data.count ?? 0;

        if (wasLiked) {
          transaction.set(docRef, {
            count: Math.max(0, currentCount - 1),
            users: users.filter((u) => u !== uid),
          });
        } else {
          transaction.set(docRef, {
            count: currentCount + 1,
            users: [...users, uid],
          });
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[LikeButton] 좋아요 저장 실패:", error);
      }
      // 실패 시 롤백
      setLiked(wasLiked);
      setCount((prev) => prev + (wasLiked ? 1 : -1));
    }
  }, [slug, liked, loading, unavailable]);

  if (unavailable) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium bg-gray-50 text-gray-300 cursor-not-allowed"
        aria-label="좋아요 기능을 사용할 수 없습니다"
        title="좋아요 기능 준비 중"
      >
        <Heart size={16} />
        <span>좋아요</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        liked
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      } ${loading ? "opacity-50" : ""}`}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
    >
      <Heart
        size={16}
        className={`transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`}
      />
      <span>{count > 0 ? count : "좋아요"}</span>
    </button>
  );
}
