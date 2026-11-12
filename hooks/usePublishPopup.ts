"use client";

import { useState, useCallback, useRef } from "react";
import { getAccessToken } from "@/lib/supabase";
import { getNextPublishDate } from "@/lib/publish-schedule";
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
  const recommendationRequest = useRef(0);
  const modeRef = useRef<PublishMode>("schedule");

  const fetchRecommendedDate = useCallback(async (requestId: number) => {
    try {
      const token = await getAccessToken();

      // Fetch schedule
      const schedRes = await fetch("/api/admin/site-config/schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!schedRes.ok) throw new Error("발행 요일을 불러오지 못했습니다. 창을 닫고 다시 시도해 주세요.");
      const schedJson = await schedRes.json();
      const days: number[] = schedJson.data.publishDays;
      const postsRes = await fetch("/api/admin/blog-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!postsRes.ok) throw new Error("예약된 글을 불러오지 못했습니다. 창을 닫고 다시 시도해 주세요.");
      const postsJson = await postsRes.json();
      const recommended = getNextPublishDate({ publishDays: days, posts: postsJson.data, today: getTodayKST() });
      if (!recommended) throw new Error("추천할 수 있는 발행 날짜가 없습니다. 발행 일정을 확인해 주세요.");
      if (requestId !== recommendationRequest.current) return;
      setScheduledDate(recommended);
      if (modeRef.current === "schedule") setPublishDate(recommended);
    } catch (error) {
      if (requestId !== recommendationRequest.current) return;
      setError(error instanceof Error ? error.message : "발행 일정을 불러오지 못했습니다.");
    }
  }, []);

  const open = useCallback((slug: string) => {
    setPublishingSlug(slug);
    modeRef.current = "schedule";
    setPublishMode("schedule");
    setPublishDate("");
    setScheduledDate("");
    setError(null);
    void fetchRecommendedDate(++recommendationRequest.current);
  }, [fetchRecommendedDate]);

  const close = useCallback(() => {
    recommendationRequest.current += 1;
    setPublishingSlug(null);
    setError(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!publishingSlug || !publishDate) return;
    setPublishing(true);
    setError(null);
    try {
      const token = await getAccessToken();
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
    setPublishMode: (mode: PublishMode) => {
      modeRef.current = mode;
      setPublishMode(mode);
    },
    open,
    close,
    confirm,
  };
}
