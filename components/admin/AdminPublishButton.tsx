"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getFirebaseAuth } from "@/lib/firebase";

interface AdminPublishButtonProps {
  slug: string;
}

/**
 * 관리자에게만 보이는 발행 예약 버튼.
 * draft(published=false) 포스트일 때만 표시.
 * 블로그 상세 페이지 헤더에서 사용.
 */
export function AdminPublishButton({ slug }: AdminPublishButtonProps) {
  const isAdmin = useAdminAuth();
  const [isDraft, setIsDraft] = useState<boolean | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Check if post is draft
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/blog-posts/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const post = json.data ?? json;
        setIsDraft(post.published === false);
      } catch {
        // silently ignore
      }
    })();
  }, [isAdmin, slug]);

  const fetchRecommendedDate = useCallback(async () => {
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      // Fetch schedule
      const schedRes = await fetch("/api/admin/site-config/schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const schedJson = schedRes.ok ? await schedRes.json() : null;
      const days: number[] = schedJson?.data?.publishDays ?? [1, 3, 5];

      // Fetch all posts for scheduled dates
      const postsRes = await fetch("/api/admin/blog-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const postsJson = postsRes.ok ? await postsRes.json() : null;
      const posts: { published: boolean; date: string }[] =
        postsJson?.data ?? postsJson ?? [];

      const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const scheduledDates = new Set(
        posts
          .filter((p) => p.published && p.date > today)
          .map((p) => p.date),
      );

      // Find next available date
      const d = new Date();
      for (let i = 0; i < 90; i++) {
        const iso = d.toISOString().slice(0, 10);
        const dow = d.getDay();
        if (days.includes(dow) && !scheduledDates.has(iso) && iso >= today) {
          setPublishDate(iso);
          return;
        }
        d.setDate(d.getDate() + 1);
      }
      // Fallback: tomorrow
      const fb = new Date();
      fb.setDate(fb.getDate() + 1);
      setPublishDate(fb.toISOString().slice(0, 10));
    } catch {
      const fb = new Date();
      fb.setDate(fb.getDate() + 1);
      setPublishDate(fb.toISOString().slice(0, 10));
    }
  }, []);

  const handleOpen = () => {
    setShowPopup(true);
    fetchRecommendedDate();
  };

  const handleConfirm = async () => {
    if (!publishDate) return;
    setPublishing(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/blog-posts/${slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: true, date: publishDate }),
      });
      if (res.ok) {
        setPublished(true);
        setShowPopup(false);
        setIsDraft(false);
      }
    } catch {
      // silently ignore
    } finally {
      setPublishing(false);
    }
  };

  if (!isAdmin || isDraft !== true) return null;
  if (published) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white">
        <Calendar size={14} aria-hidden="true" />
        발행 예약됨 ({publishDate})
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        aria-label="발행 예약"
      >
        <Calendar size={14} aria-hidden="true" />
        발행 예약
      </button>

      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="발행 예약"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPopup(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">발행 예약</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-1 text-sm text-[var(--muted)]">
              스케줄 기반 추천 날짜입니다. 변경할 수 있습니다.
            </p>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPopup(false)}
                disabled={publishing}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={publishing || !publishDate}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                {publishing ? "처리 중..." : "발행 예약"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
