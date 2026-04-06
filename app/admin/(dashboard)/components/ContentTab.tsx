"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, Check, FileText, Loader2, Save, Sparkles } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { PostsSubTab } from "@/app/admin/(dashboard)/components/blog/PostsSubTab";
import { StatsSubTab } from "@/app/admin/(dashboard)/components/blog/StatsSubTab";
import { StrategySubTab } from "@/app/admin/(dashboard)/components/insight/StrategySubTab";
import { useAdminSubTab, AdminSubTabs } from "./AdminSubTabs";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { getTodayKST } from "@/lib/date";

const SUB_TABS = [
  { id: "posts", label: "포스트 관리", icon: FileText },
  { id: "schedule", label: "발행 일정", icon: CalendarDays },
  { id: "stats", label: "성과", icon: BarChart3 },
  { id: "strategy", label: "콘텐츠 전략", icon: Sparkles },
] as const;

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function ContentTab() {
  const activeSub = useAdminSubTab(SUB_TABS, "posts");

  return (
    <div>
      <AdminSubTabs tabs={SUB_TABS} parentLabel="콘텐츠" parentTab="content" defaultSub="posts" />
      {activeSub === "posts" && <PostsSubTab />}
      {activeSub === "schedule" && <ContentScheduleManager />}
      {activeSub === "stats" && <StatsSubTab />}
      {activeSub === "strategy" && <StrategySubTab />}
    </div>
  );
}

export function ContentScheduleManager() {
  const today = getTodayKST();
  const { data, loading, refetch } = useAdminApi<{ publishDays: number[] }>("/api/admin/site-config/schedule");
  const { data: postsData } = useAdminApi<Array<{ slug: string; title: string; date: string; published: boolean }>>("/api/admin/blog-posts");
  const { mutate, loading: saving } = useAdminMutation();
  const [saved, setSaved] = useState(false);
  const [formEdits, setFormEdits] = useState<number[] | null>(null);

  const days = formEdits ?? data?.publishDays ?? [1, 3, 5];
  const futureScheduledPosts = (postsData ?? [])
    .filter((post) => post.published && post.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const publishedTodayPosts = (postsData ?? [])
    .filter((post) => post.published && post.date === today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const toggleDay = (day: number) => {
    setFormEdits((prev) => {
      const current = prev ?? data?.publishDays ?? [1, 3, 5];
      if (current.includes(day)) {
        if (current.length <= 1) return current;
        return current.filter((value) => value !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    const { error } = await mutate("/api/admin/site-config/schedule", "PUT", { publishDays: days });
    if (!error) {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중...
        </div>
      </AdminSurface>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-[var(--foreground)]">발행 요일 정책</h3>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              추천 발행일 계산과 예약 발행 흐름에 쓰이는 기본 요일 정책입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {DAY_LABELS.map((label, index) => {
            const selected = days.includes(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleDay(index)}
                className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors sm:w-10 ${
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-[var(--muted)]">
          선택된 요일: {days.map((day) => DAY_LABELS[day]).join(", ")} (주 {days.length}회)
        </p>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <h3 className="text-lg font-bold text-[var(--foreground)]">발행 일정 현황</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          다가오는 예약 발행과 오늘 이미 공개된 포스트를 분리해서 확인합니다.
        </p>

        <div className="mt-4 space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">다가오는 예약 발행</h4>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                {futureScheduledPosts.length}건
              </span>
            </div>
            <div className="space-y-3">
              {futureScheduledPosts.length > 0 ? (
                futureScheduledPosts.map((post) => (
                  <div key={post.slug} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{post.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{post.date}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
                  오늘 이후 예약된 글이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">오늘 발행 완료</h4>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {publishedTodayPosts.length}건
              </span>
            </div>
            <div className="space-y-3">
              {publishedTodayPosts.length > 0 ? (
                publishedTodayPosts.map((post) => (
                  <div key={post.slug} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{post.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{post.date}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
                  오늘 이미 발행된 글은 없습니다.
                </div>
              )}
            </div>
          </section>
        </div>
      </AdminSurface>
    </div>
  );
}
