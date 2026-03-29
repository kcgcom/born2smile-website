"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAccessToken } from "@/lib/supabase";
import { useBlogEditContext } from "@/components/blog/BlogEditProvider";
import { ALL_CATEGORY_SLUGS, BLOG_CATEGORY_LABELS } from "@/lib/blog/category-slugs";
import { BLOG_TAGS } from "@/lib/blog/types";
import type { BlogCategorySlug } from "@/lib/blog";

interface PostMeta {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
}

export function InlineBlogEditButton({ post }: { post: PostMeta }) {
  const isAdmin = useAdminAuth();
  const router = useRouter();
  const { isEditMode, enter, exit, blocks } = useBlogEditContext();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [title, setTitle] = useState(post.title);
  const [subtitle, setSubtitle] = useState(post.subtitle);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [category, setCategory] = useState<BlogCategorySlug>(post.category);
  const [tags, setTags] = useState<string[]>(post.tags);
  const [date, setDate] = useState(post.date);

  const inflightRef = useRef(false);
  const { slug } = post;

  const handleExit = () => {
    setTitle(post.title);
    setSubtitle(post.subtitle);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setTags(post.tags);
    setDate(post.date);
    setSaveError(null);
    exit();
  };

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
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
            published: true,
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
    },
    [slug, title, subtitle, excerpt, category, tags, date, blocks, exit, router],
  );

  if (!isAdmin) return null;

  if (!isEditMode) {
    return (
      <button
        type="button"
        onClick={enter}
        className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        aria-label="글 편집 모드 시작"
        title="글 정보 및 블록 수정"
      >
        <Pencil size={14} aria-hidden="true" />
        편집 모드
      </button>
    );
  }

  return (
    <div className="mt-3 w-full">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">글 정보 수정</span>
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-1.5 rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          <X size={13} />
          편집 종료
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-5"
      >
        {saveError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveError}
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold focus:border-blue-400 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">부제</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">요약</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus:border-blue-400 focus:outline-none"
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BlogCategorySlug)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              {ALL_CATEGORY_SLUGS.map((s) => (
                <option key={s} value={s}>
                  {BLOG_CATEGORY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">태그</label>
          <div className="flex flex-wrap gap-3">
            {BLOG_TAGS.map((tag) => (
              <label key={tag} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
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

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check size={14} />
          {saving ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
