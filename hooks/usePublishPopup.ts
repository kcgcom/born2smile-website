"use client";

import { useState, useCallback } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { getTodayKST } from "@/lib/date";
import type { PublishMode } from "@/components/admin/PublishPopup";

interface UsePublishPopupOptions {
  /** Called after successful publish */
  onPublished?: (slug: string, date: string) => void;
}

export function usePublishPopup(options?: UsePublishPopupOptions) {
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("schedule");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = getTodayKST();

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

      const todayKST = getTodayKST();
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

  const open = useCallback((slug: string) => {
    setPublishingSlug(slug);
    setPublishMode("schedule");
    setError(null);
    fetchRecommendedDate();
  }, [fetchRecommendedDate]);

  const close = useCallback(() => {
    setPublishingSlug(null);
    setError(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!publishingSlug || !publishDate) return;
    setPublishing(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("로그인이 필요합니다");
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/blog-posts/${publishingSlug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: true, date: publishDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "발행에 실패했습니다" }));
        throw new Error(err.message ?? "발행에 실패했습니다");
      }
      options?.onPublished?.(publishingSlug, publishDate);
      setPublishingSlug(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "발행에 실패했습니다");
    } finally {
      setPublishing(false);
    }
  }, [publishingSlug, publishDate, options]);

  return {
    /** Currently open slug (null = closed) */
    publishingSlug,
    publishDate,
    publishMode,
    scheduledDate,
    publishing,
    error,
    today,
    setPublishDate,
    setPublishMode,
    open,
    close,
    confirm,
  };
}
