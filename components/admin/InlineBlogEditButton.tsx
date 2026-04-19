"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Calendar, ChevronDown, ChevronUp, Eye, Pencil, RotateCcw, Save, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";
import { usePublishPopup } from "@/hooks/usePublishPopup";
import { useBlogEditContext } from "@/components/blog/BlogEditProvider";
import { ALL_CATEGORY_SLUGS, BLOG_CATEGORY_LABELS } from "@/lib/blog/category-slugs";
import { BLOG_TAGS } from "@/lib/blog/types";
import type { BlogCategorySlug } from "@/lib/blog";
import { PublishPopup } from "./PublishPopup";

interface PostMeta {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
  published?: boolean;
  publicUrl?: string;
}

export function InlineBlogEditButton({ post }: { post: PostMeta }) {
  const isAdmin = useAdminAuth();
  const router = useRouter();
  const { isEditMode, enter, exit, blocks } = useBlogEditContext();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const [title, setTitle] = useState(post.title);
  const [subtitle, setSubtitle] = useState(post.subtitle);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [category, setCategory] = useState<BlogCategorySlug>(post.category);
  const [tags, setTags] = useState<string[]>(post.tags);
  const [date, setDate] = useState(post.date);
  const [toolbarHeight, setToolbarHeight] = useState<number | null>(null);
  const [publishedDate, setPublishedDate] = useState<string | null>(null);
  const [metaCollapsed, setMetaCollapsed] = useState(true);

  const inflightRef = useRef(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const { slug } = post;
  const popup = usePublishPopup({
    onPublished: (_slug, nextDate) => {
      setPublishedDate(nextDate);
      setRefreshNotice(nextDate ? `발행 처리 완료 (${nextDate})` : "발행 처리 완료");
      router.refresh();
    },
  });
  const normalizeTags = (value: string[]) => [...value].sort().join("|");
  const hasMetaChanges =
    title !== post.title ||
    subtitle !== post.subtitle ||
    excerpt !== post.excerpt ||
    category !== post.category ||
    date !== post.date ||
    normalizeTags(tags) !== normalizeTags(post.tags);
  const toolbarStatus = isEditMode
    ? hasMetaChanges
      ? {
        label: "메타 변경사항 있음",
        tone: "amber" as const,
      }
      : {
        label: "편집 중",
        tone: "sky" as const,
      }
    : {
      label: "읽기 모드",
      tone: "slate" as const,
    };

  useEffect(() => {
    document.documentElement.dataset.blogEditMode = isEditMode ? "1" : "0";
    window.dispatchEvent(
      new CustomEvent("born2smile:blog-edit-mode", {
        detail: { active: isEditMode },
      }),
    );
  }, [isEditMode]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.blogEditMode;
      window.dispatchEvent(
        new CustomEvent("born2smile:blog-edit-mode", {
          detail: { active: false },
        }),
      );
    };
  }, []);

  useLayoutEffect(() => {
    const element = toolbarRef.current;
    if (!element) return;

    const syncToolbarHeight = () => {
      setToolbarHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    syncToolbarHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(syncToolbarHeight);
      observer.observe(element);
      window.addEventListener("resize", syncToolbarHeight);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", syncToolbarHeight);
      };
    }

    window.addEventListener("resize", syncToolbarHeight);
    return () => window.removeEventListener("resize", syncToolbarHeight);
  }, [isEditMode, hasMetaChanges]);

  const handleResetMeta = () => {
    setTitle(post.title);
    setSubtitle(post.subtitle);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setTags(post.tags);
    setDate(post.date);
    setSaveError(null);
  };

  const handleExit = () => {
    handleResetMeta();
    exit();
  };

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "새로고침에 실패했어요");
      }
      setRefreshNotice("공개 페이지 캐시를 새로고침했습니다.");
      router.refresh();
    } catch (err) {
      setRefreshNotice(err instanceof Error ? err.message : "새로고침에 실패했어요");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, router, slug]);

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/blog-posts/${slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          subtitle: subtitle.trim(),
          excerpt: excerpt.trim(),
          category,
          tags,
          date,
          blocks,
          published: post.published ?? true,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "저장에 실패했어요");
      }
      exit();
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했어요");
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      {/* 고정 관리자 바 — 사이트 헤더 바로 아래 연결 */}
      <AdminSurface
        tone="dark"
        className={`fixed ${post.published === false ? "top-0" : "top-[76px]"} right-0 left-0 z-40`}
        ref={toolbarRef}
      >
        <div className="px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            {/* 좌측: pills + 제목 */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <AdminPill tone="amber" className="shrink-0 tracking-[0.02em]">
                <span className="hidden sm:inline">관리자 전용</span>
                <span className="sm:hidden">관리자</span>
              </AdminPill>
              <p className="hidden truncate text-sm font-medium text-slate-100 md:block">
                블로그 편집 도구
              </p>
              {/* 상태 배지 (md 이상) */}
              <span
                className={`hidden shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold lg:inline-flex ${
                  toolbarStatus.tone === "amber"
                    ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
                    : toolbarStatus.tone === "sky"
                      ? "border-sky-300/25 bg-sky-400/10 text-sky-100"
                      : "border-white/10 bg-white/6 text-slate-200"
                }`}
              >
                {toolbarStatus.label}
              </span>
            </div>
            {/* 우측: 버튼 */}
            <div className="flex shrink-0 items-center gap-2">
              {isEditMode ? (
                <>
                  <AdminActionButton
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    tone="primary"
                    className="rounded-full px-4"
                  >
                    <Save size={14} />
                    {saving ? "저장 중..." : "저장"}
                  </AdminActionButton>
                  <AdminActionButton
                    type="button"
                    onClick={handleExit}
                    disabled={saving}
                    tone="ghost"
                    className="rounded-full bg-white/10 px-4 text-white hover:bg-white/15"
                  >
                    <X size={14} />
                    편집 종료
                  </AdminActionButton>
                </>
              ) : (
                <>
                  <AdminActionButton
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    tone="ghost"
                    className="rounded-full border-white/12 bg-white/6 px-4 text-slate-100"
                  >
                    <RotateCcw size={14} aria-hidden="true" className={refreshing ? "animate-spin" : undefined} />
                    <span className="hidden sm:inline">{refreshing ? "새로고침 중..." : "새로고침"}</span>
                  </AdminActionButton>
                  {post.published === false && !publishedDate && (
                    <AdminActionButton
                      type="button"
                      onClick={() => popup.open(slug)}
                      disabled={popup.publishing}
                      tone="primary"
                      className="rounded-full px-4"
                    >
                      <Calendar size={14} />
                      발행
                    </AdminActionButton>
                  )}
                  <AdminActionButton
                    type="button"
                    onClick={enter}
                    tone="primary"
                    className="rounded-full px-4"
                  >
                    <Pencil size={14} />
                    편집 모드
                  </AdminActionButton>
                </>
              )}
            </div>
          </div>
        </div>
        {post.published === false && (
          <div className="flex items-center gap-2 border-t border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200">
            <Eye size={13} aria-hidden="true" />
            <span>초안 미리보기 — 발행 전 내용입니다</span>
            {post.publicUrl && (
              <a
                href={post.publicUrl}
                target="_blank"
                rel="noopener"
                className="ml-auto flex items-center gap-1 text-amber-300 underline hover:no-underline"
              >
                공개 페이지 <ArrowUpRight size={11} />
              </a>
            )}
          </div>
        )}
      </AdminSurface>
      <div
        aria-hidden="true"
        className="h-[52px]"
        style={toolbarHeight ? { height: `${toolbarHeight}px` } : undefined}
      />

      {/* 편집 모드: 메타 폼 (일반 문서 흐름) */}
      {isEditMode && (
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-6 md:py-8">
          <div className="mx-auto max-w-4xl">
            <AdminSurface tone="white" className="mb-5 rounded-2xl px-4 py-4 md:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">포스트 메타 편집</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    slug · {slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <AdminPill tone={hasMetaChanges ? "warning" : "white"} className="w-fit text-xs">
                    {hasMetaChanges ? "저장 전 변경사항" : "저장된 상태"}
                  </AdminPill>
                  <AdminActionButton
                    type="button"
                    onClick={() => setMetaCollapsed((prev) => !prev)}
                    disabled={saving}
                    tone="dark"
                    className="px-3 py-2 text-xs"
                  >
                    {metaCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    {metaCollapsed ? "펼치기" : "접기"}
                  </AdminActionButton>
                  <AdminActionButton
                    type="button"
                    onClick={handleResetMeta}
                    disabled={!hasMetaChanges || saving}
                    tone="dark"
                    className="px-3 py-2 text-xs"
                  >
                    <RotateCcw size={13} />
                    메타 되돌리기
                  </AdminActionButton>
                </div>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                제목, 요약, 카테고리, 날짜와 태그를 빠르게 점검하세요.
              </p>
              {hasMetaChanges && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  아직 저장되지 않은 메타 변경사항이 있습니다.
                </p>
              )}
              {refreshNotice && (
                <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                  {refreshNotice}
                </p>
              )}
            </AdminSurface>

            {!metaCollapsed && (
              <AdminSurface tone="white" className="rounded-2xl p-4 md:p-6">
                <form onSubmit={handleSave} className="space-y-4">
                  {saveError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {saveError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">제목</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">부제</label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">요약</label>
                      <textarea
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        rows={5}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">카테고리</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as BlogCategorySlug)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                      >
                        {ALL_CATEGORY_SLUGS.map((s) => (
                          <option key={s} value={s}>
                            {BLOG_CATEGORY_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">날짜</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">태그</label>
                      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
                        {BLOG_TAGS.map((tag) => (
                          <label key={tag} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={tags.includes(tag)}
                              onChange={(e) =>
                                setTags(e.target.checked ? [...tags, tag] : tags.filter((t) => t !== tag))
                              }
                              className="rounded"
                            />
                            {tag}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                </form>
              </AdminSurface>
            )}

          </div>
        </div>
      )}

      {popup.publishingSlug && (
        <PublishPopup
          publishDate={popup.publishDate}
          publishMode={popup.publishMode}
          scheduledDate={popup.scheduledDate}
          publishing={popup.publishing}
          today={popup.today}
          error={popup.error}
          onModeChange={(mode) => {
            popup.setPublishMode(mode);
            if (mode === "schedule") popup.setPublishDate(popup.scheduledDate);
            else if (mode === "immediate") popup.setPublishDate(popup.today);
          }}
          onDateChange={popup.setPublishDate}
          onConfirm={popup.confirm}
          onClose={popup.close}
        />
      )}
    </>
  );
}
