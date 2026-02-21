"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Check, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getTodayKST } from "@/lib/date";
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
  const [publishMode, setPublishMode] = useState<"immediate" | "schedule" | "custom">("schedule");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const today = getTodayKST();

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

      const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const scheduledDates = new Set(
        posts
          .filter((p) => p.published && p.date > todayKST)
          .map((p) => p.date),
      );

      // Find next available date
      const d = new Date();
      for (let i = 0; i < 90; i++) {
        const iso = d.toISOString().slice(0, 10);
        const dow = d.getDay();
        if (days.includes(dow) && !scheduledDates.has(iso) && iso >= todayKST) {
          setPublishDate(iso);
          setScheduledDate(iso);
          return;
        }
        d.setDate(d.getDate() + 1);
      }
      // Fallback: tomorrow
      const fb = new Date();
      fb.setDate(fb.getDate() + 1);
      const fbDate = fb.toISOString().slice(0, 10);
      setPublishDate(fbDate);
      setScheduledDate(fbDate);
    } catch {
      const fb = new Date();
      fb.setDate(fb.getDate() + 1);
      const fbDate = fb.toISOString().slice(0, 10);
      setPublishDate(fbDate);
      setScheduledDate(fbDate);
    }
  }, []);

  const handleOpen = () => {
    setShowPopup(true);
    setPublishMode("schedule");
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
          aria-label="발행"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPopup(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">발행</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <fieldset className="mb-4 space-y-2">
              <legend className="sr-only">발행 방식 선택</legend>

              {/* 스케줄에 맞춰 발행 (기본) */}
              <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "schedule"
                  ? "border-[var(--color-primary)] bg-blue-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="schedule"
                  checked={publishMode === "schedule"}
                  onChange={() => {
                    setPublishMode("schedule");
                    setPublishDate(scheduledDate);
                  }}
                  className="accent-[var(--color-primary)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--foreground)]">스케줄에 맞춰 발행</span>
                  <p className="text-xs text-[var(--muted)]">
                    {scheduledDate ? `추천 날짜: ${scheduledDate}` : "날짜 계산 중..."}
                  </p>
                </div>
              </label>

              {/* 즉시 발행 */}
              <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "immediate"
                  ? "border-green-500 bg-green-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="immediate"
                  checked={publishMode === "immediate"}
                  onChange={() => {
                    setPublishMode("immediate");
                    setPublishDate(today);
                  }}
                  className="accent-green-600"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--foreground)]">즉시 발행</span>
                  <p className="text-xs text-[var(--muted)]">오늘 ({today}) 바로 공개됩니다</p>
                </div>
              </label>

              {/* 날짜 직접 선택 */}
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "custom"
                  ? "border-[var(--color-gold)] bg-amber-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="custom"
                  checked={publishMode === "custom"}
                  onChange={() => setPublishMode("custom")}
                  className="mt-0.5 accent-[var(--color-gold)]"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">날짜 직접 선택</span>
                  {publishMode === "custom" && (
                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/15"
                    />
                  )}
                </div>
              </label>
            </fieldset>

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
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  publishMode === "immediate"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                }`}
              >
                {publishMode === "immediate" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {publishing
                  ? "처리 중..."
                  : publishMode === "immediate"
                  ? "즉시 발행"
                  : "발행 예약"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
