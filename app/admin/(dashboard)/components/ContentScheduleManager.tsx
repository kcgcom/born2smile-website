"use client";

import { useState } from "react";
import { Check, Loader2, Save, Sparkles } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { getTodayKST } from "@/lib/date";
import { getAdminPreviewUrl, getBlogPostUrl, normalizeBlogCategory } from "@/lib/blog/category-slugs";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

interface SchedulePostItem {
  slug: string;
  title: string;
  date: string;
  published: boolean;
  category?: string;
}

function SchedulePostCard({ post, isPublic }: { post: SchedulePostItem; isPublic: boolean }) {
  const category = normalizeBlogCategory(post.category ?? "");
  const editorHref = `/admin/content/posts/${encodeURIComponent(post.slug)}?from=schedule`;
  return (
    <article aria-label={post.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <AdminActionLink tone="dark" href={editorHref} className="justify-start break-words text-left">{post.title}</AdminActionLink>
      <p className="mt-2 text-xs text-[var(--muted)]"><time dateTime={post.date}>{post.date}</time> · {isPublic ? "공개 중" : "공개 예정"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminActionLink tone="primary" href={editorHref}>{isPublic ? "내용 확인·수정" : "검토·예약일 변경"}</AdminActionLink>
        {category && <AdminActionLink tone="dark" href={isPublic ? getBlogPostUrl(post.slug, category) : getAdminPreviewUrl(post.slug, category)} target="_blank" rel="noopener noreferrer">{isPublic ? "공개 페이지 (새 창)" : "미리보기 (새 창)"}</AdminActionLink>}
      </div>
    </article>
  );
}

export function ContentScheduleManager({
  embedded = false,
  initialPublishDays,
  initialPosts,
  loadingOverride = false,
}: {
  embedded?: boolean;
  initialPublishDays?: number[];
  initialPosts?: SchedulePostItem[];
  loadingOverride?: boolean;
}) {
  const today = getTodayKST();
  const shouldFetch = !embedded;
  const { data, loading, error: policyError, refetch } = useAdminApi<{ publishDays: number[] }>("/api/admin/site-config/schedule", shouldFetch);
  const { data: postsData, loading: postsLoading, error: postsError, refetch: refetchPosts } = useAdminApi<SchedulePostItem[]>("/api/admin/blog-posts", shouldFetch);
  const { mutate, loading: saving, error: saveError } = useAdminMutation();
  const [saved, setSaved] = useState(false);
  const [formEdits, setFormEdits] = useState<number[] | null>(null);
  const [savedPublishDays, setSavedPublishDays] = useState<number[] | null>(null);

  const currentPublishDays = embedded ? (savedPublishDays ?? initialPublishDays) : data?.publishDays;
  const days = formEdits ?? currentPublishDays ?? [1, 3, 5];
  const posts = embedded ? (initialPosts ?? []) : (postsData ?? []);
  const futureScheduledPosts = posts
    .filter((post) => post.published && post.date > today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const publishedTodayPosts = posts
    .filter((post) => post.published && post.date === today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const toggleDay = (day: number) => {
    setFormEdits((prev) => {
      const current = prev ?? currentPublishDays ?? [1, 3, 5];
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
      setSavedPublishDays(days);
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!embedded) {
        refetch();
      }
    }
  };

  if (loading || loadingOverride) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중...
        </div>
      </AdminSurface>
    );
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
      <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-bold text-[var(--foreground)]">일정 현황</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          한국시간 기준 · 글을 눌러 예약 변경
        </p>

        {postsLoading ? <p role="status" className="mt-4 text-sm">발행 일정을 불러오는 중…</p>
          : postsError ? <AdminNotice tone="error">발행 일정을 불러오지 못했습니다. <button type="button" onClick={refetchPosts} className="underline">다시 시도</button></AdminNotice>
          : <div className="mt-4 space-y-5">
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
                  <SchedulePostCard key={post.slug} post={post} isPublic={false} />
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
              <h4 className="text-sm font-semibold text-[var(--foreground)]">오늘 공개</h4>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {publishedTodayPosts.length}건
              </span>
            </div>
            <div className="space-y-3">
              {publishedTodayPosts.length > 0 ? (
                publishedTodayPosts.map((post) => (
                  <SchedulePostCard key={post.slug} post={post} isPublic />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
                  오늘 이미 발행된 글은 없습니다.
                </div>
              )}
            </div>
          </section>
        </div>}
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                {embedded ? "발행 정책과 일정" : "발행 요일 정책"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              새 글의 추천 요일입니다. 기존 예약일은 바뀌지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!embedded && (Boolean(policyError) || !data))}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
            </button>
          </div>
        </div>

        {policyError && <AdminNotice tone="error">발행 요일 정책을 불러오지 못했습니다. <button type="button" onClick={refetch} className="underline">다시 시도</button></AdminNotice>}
        {saveError && <AdminNotice tone="error">저장 실패: {saveError}</AdminNotice>}

        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {DAY_LABELS.map((label, index) => {
            const selected = days.includes(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleDay(index)}
                aria-pressed={selected}
                disabled={saving || (!embedded && (Boolean(policyError) || !data))}
                className={`flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors sm:w-10 ${
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


    </div>
  );
}
