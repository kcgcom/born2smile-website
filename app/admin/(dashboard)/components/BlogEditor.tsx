"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import { BLOG_CATEGORIES, BLOG_TAGS } from "@/lib/blog/types";
import type { BlogCategoryValue, BlogTag } from "@/lib/blog/types";
import { getFirebaseAuth } from "@/lib/firebase";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface BlogEditorData {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  content: { heading: string; content: string }[];
  published: boolean;
}

interface BlogEditorProps {
  mode: "create" | "edit";
  initialData?: {
    slug: string;
    title: string;
    subtitle: string;
    excerpt: string;
    category: string;
    tags: string[];
    date: string;
    content: { heading: string; content: string }[];
    published?: boolean;
  };
  onSave: (data: BlogEditorData) => Promise<{ error: string | null }>;
  onClose: () => void;
}

// -------------------------------------------------------------
// Validation
// -------------------------------------------------------------

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/;

function validate(form: BlogEditorData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!SLUG_RE.test(form.slug)) {
    errors.slug = "슬러그는 영소문자·숫자·하이픈만 허용, 첫·끝은 영소문자·숫자여야 합니다";
  }
  if (form.title.length < 5) errors.title = "제목은 5자 이상이어야 합니다";
  if (form.title.length > 100) errors.title = "제목은 100자 이하여야 합니다";
  if (form.subtitle.length < 5) errors.subtitle = "부제는 5자 이상이어야 합니다";
  if (form.subtitle.length > 150) errors.subtitle = "부제는 150자 이하여야 합니다";
  if (form.excerpt.length < 20) errors.excerpt = "요약은 20자 이상이어야 합니다";
  if (form.excerpt.length > 500) errors.excerpt = "요약은 500자 이하여야 합니다";
  if (form.content.length === 0) errors.content = "섹션이 최소 1개 필요합니다";
  else {
    for (let i = 0; i < form.content.length; i++) {
      const sec = form.content[i];
      if (!sec.heading.trim()) {
        errors[`content_heading_${i}`] = `섹션 ${i + 1} 제목이 비어 있습니다`;
      }
      if (sec.content.length < 50) {
        errors[`content_body_${i}`] = `섹션 ${i + 1} 내용은 50자 이상이어야 합니다`;
      }
    }
  }

  return errors;
}

// -------------------------------------------------------------
// Helper: calculate read time from content sections
// -------------------------------------------------------------

function calcReadTime(sections: { heading: string; content: string }[]): string {
  const chars = sections.reduce((sum, s) => sum + s.content.length, 0);
  const mins = Math.max(1, Math.ceil(chars / 500));
  return `${mins}분`;
}

// -------------------------------------------------------------
// Default empty section
// -------------------------------------------------------------

function emptySection() {
  return { heading: "", content: "" };
}

// -------------------------------------------------------------
// BlogEditor component
// -------------------------------------------------------------

export default function BlogEditor({ mode, initialData, onSave, onClose }: BlogEditorProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<BlogEditorData>({
    slug: initialData?.slug ?? "",
    title: initialData?.title ?? "",
    subtitle: initialData?.subtitle ?? "",
    excerpt: initialData?.excerpt ?? "",
    category: initialData?.category ?? (BLOG_CATEGORIES.find((c) => c !== "전체") ?? ""),
    tags: initialData?.tags ?? [],
    date: initialData?.date ?? today,
    content: initialData?.content?.length ? initialData.content : [emptySection()],
    published: initialData?.published ?? false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingContent, setFetchingContent] = useState(false);

  // In edit mode, fetch full post content (list API returns metadata only)
  useEffect(() => {
    if (mode !== "edit" || !initialData?.slug) return;
    // If content was already provided (non-empty), skip fetch
    if (initialData.content && initialData.content.length > 0) return;

    setFetchingContent(true);
    (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`/api/admin/blog-posts/${initialData.slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const post = json.data ?? json;
        if (Array.isArray(post.content) && post.content.length > 0) {
          setForm((prev) => ({ ...prev, content: post.content }));
        }
      } catch {
        // silently ignore; user can fill content manually
      } finally {
        setFetchingContent(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readTime = useMemo(() => calcReadTime(form.content), [form.content]);

  // ------ field updaters ------

  const setField = useCallback(<K extends keyof BlogEditorData>(key: K, value: BlogEditorData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }, []);

  const setSectionField = useCallback(
    (idx: number, field: "heading" | "content", value: string) => {
      setForm((prev) => {
        const content = prev.content.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
        return { ...prev, content };
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`content_heading_${idx}`];
        delete next[`content_body_${idx}`];
        delete next.content;
        return next;
      });
    },
    [],
  );

  const addSection = useCallback(() => {
    setForm((prev) => {
      if (prev.content.length >= 10) return prev;
      return { ...prev, content: [...prev.content, emptySection()] };
    });
  }, []);

  const removeSection = useCallback((idx: number) => {
    setForm((prev) => {
      if (prev.content.length <= 1) return prev;
      return { ...prev, content: prev.content.filter((_, i) => i !== idx) };
    });
  }, []);

  const toggleTag = useCallback((tag: BlogTag) => {
    setForm((prev) => {
      const has = prev.tags.includes(tag);
      const next = has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag];
      if (!has && next.length > 5) return prev; // max 5
      return { ...prev, tags: next };
    });
  }, []);

  // ------ submit ------

  const handleSubmit = async () => {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { error } = await onSave({ ...form, published: form.published });
    setSaving(false);
    if (error) setSaveError(error);
  };

  // ------ category options (exclude "전체") ------
  const categoryOptions = BLOG_CATEGORIES.filter((c) => c !== "전체") as BlogCategoryValue[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "새 포스트 작성" : "포스트 수정"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-[var(--surface)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {mode === "create" ? "새 포스트 작성" : "포스트 수정"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)]"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {fetchingContent && (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              포스트 본문을 불러오는 중...
            </div>
          )}

          {/* Slug */}
          <Field label="슬러그 (URL)" required error={fieldErrors.slug}>
            <input
              type="text"
              value={form.slug}
              readOnly={mode === "edit"}
              onChange={(e) => setField("slug", e.target.value.toLowerCase())}
              placeholder="my-post-slug"
              className={inputClass(!!fieldErrors.slug, mode === "edit")}
            />
          </Field>

          {/* Title */}
          <Field label="제목" required error={fieldErrors.title} hint={`${form.title.length}/100`}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              maxLength={100}
              className={inputClass(!!fieldErrors.title)}
            />
          </Field>

          {/* Subtitle */}
          <Field label="부제" required error={fieldErrors.subtitle} hint={`${form.subtitle.length}/150`}>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setField("subtitle", e.target.value)}
              maxLength={150}
              className={inputClass(!!fieldErrors.subtitle)}
            />
          </Field>

          {/* Category */}
          <Field label="카테고리" required>
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className={inputClass(false)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>

          {/* Tags */}
          <Field label="태그" hint="최대 5개">
            <div className="flex flex-wrap gap-2 pt-1">
              {BLOG_TAGS.map((tag) => {
                const selected = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--border)] bg-gray-50 text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Date */}
          <Field label="발행일" required hint="발행 시 변경 가능">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className={inputClass(false)}
            />
          </Field>

          {/* Excerpt */}
          <Field label="요약" required error={fieldErrors.excerpt} hint={`${form.excerpt.length}/500`}>
            <textarea
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass(!!fieldErrors.excerpt)} resize-none`}
            />
          </Field>

          {/* Read time (read-only) */}
          <Field label="예상 읽기 시간 (자동계산)">
            <div className="flex h-9 items-center rounded-lg border border-[var(--border)] bg-gray-100 px-3 text-sm text-[var(--muted)]">
              {readTime}
            </div>
          </Field>

          {/* Content sections */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                본문 섹션 <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-[var(--muted)]">({form.content.length}/10)</span>
              </label>
            </div>
            {fieldErrors.content && (
              <p className="mb-2 text-xs text-red-500">{fieldErrors.content}</p>
            )}

            <div className="space-y-4">
              {form.content.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[var(--border)] bg-gray-50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--muted)]">섹션 {idx + 1}</span>
                    {form.content.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(idx)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">섹션 제목</label>
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) => setSectionField(idx, "heading", e.target.value)}
                      placeholder="섹션 제목을 입력하세요"
                      className={inputClass(!!fieldErrors[`content_heading_${idx}`])}
                    />
                    {fieldErrors[`content_heading_${idx}`] && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors[`content_heading_${idx}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      섹션 내용
                      <span className="ml-1 font-normal">({sec.content.length}자)</span>
                    </label>
                    <textarea
                      value={sec.content}
                      onChange={(e) => setSectionField(idx, "content", e.target.value)}
                      placeholder="섹션 본문을 입력하세요 (최소 50자)"
                      rows={5}
                      className={`${inputClass(!!fieldErrors[`content_body_${idx}`])} resize-y`}
                    />
                    {fieldErrors[`content_body_${idx}`] && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors[`content_body_${idx}`]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {form.content.length < 10 && (
              <button
                type="button"
                onClick={addSection}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2.5 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                섹션 추가
              </button>
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || fetchingContent}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "임시저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function inputClass(hasError: boolean, readOnly = false): string {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2",
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
      : "border-[var(--border)] bg-white focus:border-[var(--color-primary)] focus:ring-blue-100",
    readOnly ? "bg-gray-100 cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold text-[var(--foreground)]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
