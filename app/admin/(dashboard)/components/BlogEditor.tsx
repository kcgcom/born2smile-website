"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Trash2, Save, Copy } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { BLOG_CATEGORY_SLUGS, BLOG_TAGS } from "@/lib/blog/types";
import type {
  BlogBlock,
  BlogCategorySlug,
  BlogRelatedLinkItem,
  BlogTag,
} from "@/lib/blog/types";
import { getCategoryLabel, normalizeBlogCategory } from "@/lib/blog";
import { getAccessToken } from "@/lib/supabase";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface BlogEditorData {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
  blocks: BlogBlock[];
  published: boolean;
}

interface BlogEditorProps {
  mode: "create" | "edit";
  presentation?: "drawer" | "page";
  initialData?: {
    slug: string;
    title: string;
    subtitle: string;
    excerpt: string;
    category: string;
    tags: string[];
    date: string;
    blocks?: BlogBlock[];
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
  if (!normalizeBlogCategory(form.category)) errors.category = "유효한 카테고리를 선택해 주세요";
  const blocks = form.blocks;
  if (blocks.length > 0) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.type === "heading" && !block.text.trim()) {
        errors[`block_${i}`] = `블록 ${i + 1} 제목이 비어 있습니다`;
      }
      if (block.type === "paragraph" && block.text.length < 20) {
        errors[`block_${i}`] = `블록 ${i + 1} 문단은 20자 이상이어야 합니다`;
      }
      if (block.type === "list" && block.items.some((item) => item.trim().length < 2)) {
        errors[`block_${i}`] = `블록 ${i + 1} 목록 항목을 채워 주세요`;
      }
      if (block.type === "faq" && (block.question.length < 5 || block.answer.length < 20)) {
        errors[`block_${i}`] = `블록 ${i + 1} FAQ 내용을 확인해 주세요`;
      }
      if (block.type === "relatedLinks" && block.items.some((item) => item.title.length < 2 || item.href.length < 1)) {
        errors[`block_${i}`] = `블록 ${i + 1} 관련 링크 정보를 확인해 주세요`;
      }
    }
  } else {
    errors.blocks = "블록이 최소 1개 필요합니다";
  }

  return errors;
}

// -------------------------------------------------------------
// Helper: calculate read time from blocks
// -------------------------------------------------------------

function calcReadTime(blocks: BlogBlock[] = []): string {
  const chars = blocks.reduce((sum, block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
        return sum + block.text.length;
      case "list":
        return sum + block.items.reduce((acc, item) => acc + item.length, 0);
      case "faq":
        return sum + block.question.length + block.answer.length;
      case "relatedLinks":
        return sum + block.items.reduce(
          (acc, item) => acc + item.title.length + item.href.length + (item.description?.length ?? 0),
          0,
        );
      default:
        return sum;
    }
  }, 0);
  const mins = Math.max(1, Math.ceil(chars / 500));
  return `${mins}분`;
}

// -------------------------------------------------------------
function emptyBlock(type: BlogBlock["type"] = "paragraph"): BlogBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "list":
      return { type: "list", style: "bullet", items: ["", ""] };
    case "faq":
      return { type: "faq", question: "", answer: "" };
    case "relatedLinks":
      return { type: "relatedLinks", items: [{ title: "", href: "", description: "" }] };
    case "table":
      return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "paragraph":
    default:
      return { type: "paragraph", text: "" };
  }
}

const BLOCK_LABELS: Record<BlogBlock["type"], string> = {
  heading: "제목",
  paragraph: "문단",
  list: "목록",
  faq: "FAQ",
  relatedLinks: "관련 링크",
  table: "표",
};

// -------------------------------------------------------------
// BlogEditor component
// -------------------------------------------------------------

export default function BlogEditor({
  mode,
  presentation = "drawer",
  initialData,
  onSave,
  onClose,
}: BlogEditorProps) {
  const today = new Date().toISOString().slice(0, 10);
  const isPage = presentation === "page";
  const initialCategory = normalizeBlogCategory(initialData?.category ?? "") ?? BLOG_CATEGORY_SLUGS[0];

  const [form, setForm] = useState<BlogEditorData>({
    slug: initialData?.slug ?? "",
    title: initialData?.title ?? "",
    subtitle: initialData?.subtitle ?? "",
    excerpt: initialData?.excerpt ?? "",
    category: initialCategory,
    tags: initialData?.tags ?? [],
    date: initialData?.date ?? today,
    blocks: initialData?.blocks?.length ? initialData.blocks : [emptyBlock("paragraph")],
    published: initialData?.published ?? false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // List API returns metadata only — fetch full content for editing
  useEffect(() => {
    if (mode !== "edit" || !initialData?.slug || (initialData.blocks?.length ?? 0) > 0) return;

    setFetchingContent(true);
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/admin/blog-posts/${initialData.slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const post = json.data ?? json;
        setForm((prev) => ({
          ...prev,
          blocks: Array.isArray(post.blocks) && post.blocks.length > 0
            ? post.blocks
            : [emptyBlock("paragraph")],
        }));
      } catch {
        // silently ignore; user can fill content manually
      } finally {
        setFetchingContent(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readTime = useMemo(() => calcReadTime(form.blocks), [form.blocks]);

  // ------ field updaters ------

  const setField = useCallback(<K extends keyof BlogEditorData>(key: K, value: BlogEditorData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }, []);

  const setBlock = useCallback((idx: number, nextBlock: BlogBlock) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => (i === idx ? nextBlock : block)),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`block_${idx}`];
      delete next.blocks;
      return next;
    });
  }, []);

  const addBlock = useCallback((type: BlogBlock["type"] = "paragraph") => {
    setForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, emptyBlock(type)],
    }));
  }, []);

  const removeBlock = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== idx),
    }));
  }, []);

  const duplicateBlock = useCallback((idx: number) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const target = blocks[idx];
      if (!target) return prev;
      const clone = structuredClone(target);
      blocks.splice(idx + 1, 0, clone);
      return { ...prev, blocks: blocks.slice(0, 30) };
    });
  }, []);

  const moveBlock = useCallback((idx: number, direction: -1 | 1) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= blocks.length) return prev;
      [blocks[idx], blocks[nextIdx]] = [blocks[nextIdx], blocks[idx]];
      return { ...prev, blocks };
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
    const payload = { ...form, blocks: form.blocks, published: form.published };
    const { error } = await onSave(payload);
    setSaving(false);
    if (error) setSaveError(error);
  };

  // ------ category options (exclude "전체") ------
  const categoryOptions = BLOG_CATEGORY_SLUGS;

  return (
    <div
      className={isPage ? "space-y-6" : "fixed inset-0 z-50 flex items-stretch justify-end"}
      role={isPage ? undefined : "dialog"}
      aria-modal={isPage ? undefined : true}
      aria-label={mode === "create" ? "새 포스트 작성" : "포스트 수정"}
    >
      {!isPage && (
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <AdminSurface
        tone="white"
        className={`relative z-10 flex w-full flex-col overflow-hidden ${
          isPage
            ? "mx-auto max-w-5xl rounded-[2rem] shadow-xl shadow-slate-950/8"
            : "h-full max-w-2xl rounded-none border-y-0 border-r-0 shadow-2xl"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                {mode === "create" ? "새 포스트 작성" : "포스트 수정"}
              </h2>
              <AdminPill tone="amber" className="text-[10px]">
                {mode === "create" ? "작성" : "편집"}
              </AdminPill>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              블로그 메타 정보와 본문 블록을 한 번에 관리합니다.
            </p>
          </div>
          <AdminActionButton
            onClick={onClose}
            tone="ghost"
            className="rounded-full border-white/10 bg-white/6 p-2 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </AdminActionButton>
        </div>

        {/* Scrollable body */}
        <div className={`flex-1 space-y-5 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-5 ${isPage ? "" : "overflow-y-auto"}`}>
          {fetchingContent && (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              포스트 본문을 불러오는 중...
            </div>
          )}

          {/* Slug */}
          <Field
            label="슬러그 (URL)"
            required
            error={fieldErrors.slug}
            hint={mode === "edit" && initialData?.published ? "발행된 포스트의 슬러그는 SEO 보호를 위해 변경할 수 없습니다" : undefined}
          >
            <input
              type="text"
              value={form.slug}
              readOnly={mode === "edit" && !!initialData?.published}
              onChange={(e) => setField("slug", e.target.value.toLowerCase())}
              placeholder="my-post-slug"
              className={inputClass(!!fieldErrors.slug, mode === "edit" && !!initialData?.published)}
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
          <Field label="카테고리" required error={fieldErrors.category}>
            <select
              value={form.category}
              onChange={(e) => setField("category", e.target.value as BlogCategorySlug)}
              className={inputClass(!!fieldErrors.category)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
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
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Date — 신규 작성 시 숨김 (발행 시점에 날짜 결정), 수정 모드에서 발행 포스트만 표시 */}
          {mode === "edit" && form.published && (
            <Field label="발행일" required hint="발행 시 변경 가능">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className={inputClass(false)}
              />
            </Field>
          )}

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
            <div className="flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--muted)]">
              {readTime}
            </div>
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                본문 블록 <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-[var(--muted)]">({form.blocks?.length ?? 0}/30)</span>
              </label>
            </div>
            {fieldErrors.blocks && (
              <p className="mb-2 text-xs text-red-500">{fieldErrors.blocks}</p>
            )}
            <div className="space-y-4">
              {form.blocks.map((block, idx) => (
                <div key={idx} className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--muted)]">블록 {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveBlock(idx, -1)} className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--background)]">↑</button>
                      <button type="button" onClick={() => moveBlock(idx, 1)} className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--background)]">↓</button>
                      <button
                        type="button"
                        onClick={() => duplicateBlock(idx)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-blue-50 hover:text-[var(--color-primary)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        복제
                      </button>
                      <button type="button" onClick={() => removeBlock(idx)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </div>
                  </div>
                  <select
                    value={block.type}
                    onChange={(e) => setBlock(idx, emptyBlock(e.target.value as BlogBlock["type"]))}
                    className={inputClass(false)}
                  >
                    {(Object.entries(BLOCK_LABELS) as [BlogBlock["type"], string][]).map(([type, label]) => (
                      <option key={type} value={type}>{label}</option>
                    ))}
                  </select>
                  {renderBlockEditor(block, idx, setBlock, fieldErrors)}
                  {fieldErrors[`block_${idx}`] && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors[`block_${idx}`]}</p>
                  )}
                </div>
              ))}
            </div>
            {(form.blocks?.length ?? 0) < 30 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(BLOCK_LABELS) as BlogBlock["type"][]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-xl border border-dashed border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    + {BLOCK_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <AdminNotice tone="error" className="rounded-lg">
              {saveError}
            </AdminNotice>
          )}
        </div>

        {/* Footer buttons */}
        <div className="shrink-0 flex flex-col gap-2 border-t border-[var(--border)] bg-white/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
          <AdminActionButton
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            disabled={saving}
            tone="dark"
            className="w-full px-5 sm:w-auto"
          >
            {showPreview ? "미리보기 닫기" : "미리보기"}
          </AdminActionButton>
          <AdminActionButton
            type="button"
            onClick={onClose}
            disabled={saving}
            tone="dark"
            className="w-full px-5 sm:w-auto"
          >
            취소
          </AdminActionButton>
          <AdminActionButton
            type="button"
            onClick={handleSubmit}
            disabled={saving || fetchingContent}
            tone="primary"
            className="w-full px-5 sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "임시저장"}
          </AdminActionButton>
        </div>

        {showPreview && (
          <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-5">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                Preview
              </p>
              <h1 className="font-headline text-2xl font-bold text-[var(--foreground)]">
                {form.title || "제목 미리보기"}
              </h1>
              <p className="mt-2 text-base text-[var(--muted)]">
                {form.subtitle || "부제 미리보기"}
              </p>
              <div className="mt-8 space-y-6">
                {renderBlockPreview(form.blocks)}
              </div>
            </div>
          </div>
        )}
      </AdminSurface>
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
      : "border-[var(--border)] bg-white focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/15",
    readOnly ? "bg-[var(--background)] cursor-not-allowed" : "",
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

function renderBlockPreview(blocks: BlogBlock[]) {
  return blocks.map((block, idx) => {
    switch (block.type) {
      case "heading": {
        const Tag = block.level === 3 ? "h3" : "h2";
        return (
          <Tag key={idx} className="font-headline text-xl font-bold text-[var(--foreground)]">
            {block.text || "제목 블록"}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={idx} className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
            {block.text || "문단 블록"}
          </p>
        );
      case "list": {
        const ListTag = block.style === "number" ? "ol" : "ul";
        return (
          <ListTag
            key={idx}
            className={`${block.style === "number" ? "list-decimal" : "list-disc"} space-y-2 pl-5 text-base text-gray-700`}
          >
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx}>{item || "목록 항목"}</li>
            ))}
          </ListTag>
        );
      }
      case "faq":
        return (
          <div key={idx} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h3 className="font-semibold text-[var(--foreground)]">
              {block.question || "FAQ 질문"}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
              {block.answer || "FAQ 답변"}
            </p>
          </div>
        );
      case "relatedLinks":
        return (
          <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-[var(--foreground)]">함께 읽으면 좋은 글</h3>
            <div className="mt-3 space-y-2">
              {block.items.map((item, itemIdx) => (
                <div key={itemIdx} className="rounded-lg bg-white p-3">
                  <p className="font-medium text-[var(--foreground)]">{item.title || "링크 제목"}</p>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.href || "/path"}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  });
}

function renderBlockEditor(
  block: BlogBlock,
  idx: number,
  setBlock: (idx: number, block: BlogBlock) => void,
  fieldErrors: Record<string, string>,
) {
  switch (block.type) {
    case "heading":
      return (
        <>
          <select
            value={block.level}
            onChange={(e) => setBlock(idx, { ...block, level: Number(e.target.value) as 2 | 3 })}
            className={inputClass(false)}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => setBlock(idx, { ...block, text: e.target.value })}
            placeholder="제목 텍스트"
            className={inputClass(!!fieldErrors[`block_${idx}`])}
          />
        </>
      );
    case "paragraph":
      return (
        <textarea
          value={block.text}
          onChange={(e) => setBlock(idx, { ...block, text: e.target.value })}
          rows={5}
          placeholder="문단 텍스트"
          className={`${inputClass(!!fieldErrors[`block_${idx}`])} resize-y`}
        />
      );
    case "list":
      return (
        <div className="space-y-2">
          <select
            value={block.style}
            onChange={(e) => setBlock(idx, { ...block, style: e.target.value as "bullet" | "number" })}
            className={inputClass(false)}
          >
            <option value="bullet">불릿 리스트</option>
            <option value="number">번호 리스트</option>
          </select>
          {block.items.map((item, itemIdx) => (
            <div key={itemIdx} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const items = block.items.map((current, i) => (i === itemIdx ? e.target.value : current));
                  setBlock(idx, { ...block, items });
                }}
                placeholder={`목록 항목 ${itemIdx + 1}`}
                className={inputClass(!!fieldErrors[`block_${idx}`])}
              />
              {block.items.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const items = block.items.filter((_, i) => i !== itemIdx);
                    setBlock(idx, { ...block, items });
                  }}
                  className="shrink-0 rounded px-2 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {block.items.length < 10 && (
            <button
              type="button"
              onClick={() => setBlock(idx, { ...block, items: [...block.items, ""] })}
              className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              + 목록 항목 추가
            </button>
          )}
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.question}
            onChange={(e) => setBlock(idx, { ...block, question: e.target.value })}
            placeholder="질문"
            className={inputClass(!!fieldErrors[`block_${idx}`])}
          />
          <textarea
            value={block.answer}
            onChange={(e) => setBlock(idx, { ...block, answer: e.target.value })}
            rows={4}
            placeholder="답변"
            className={`${inputClass(!!fieldErrors[`block_${idx}`])} resize-y`}
          />
        </div>
      );
    case "relatedLinks":
      return (
        <div className="space-y-3">
          {block.items.map((item, itemIdx) => (
            <RelatedLinkEditor
              key={itemIdx}
              item={item}
              canRemove={block.items.length > 1}
              onRemove={() => {
                const items = block.items.filter((_, i) => i !== itemIdx);
                setBlock(idx, { ...block, items });
              }}
              onChange={(nextItem) => {
                const items = block.items.map((current, i) => (i === itemIdx ? nextItem : current));
                setBlock(idx, { ...block, items });
              }}
            />
          ))}
          {block.items.length < 6 && (
            <button
              type="button"
              onClick={() =>
                setBlock(idx, {
                  ...block,
                  items: [...block.items, { title: "", href: "", description: "" }],
                })
              }
              className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              + 관련 링크 추가
            </button>
          )}
        </div>
      );
    default:
      return null;
  }
}

function RelatedLinkEditor({
  item,
  canRemove,
  onRemove,
  onChange,
}: {
  item: BlogRelatedLinkItem;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (item: BlogRelatedLinkItem) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex justify-end">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        )}
      </div>
      <input
        type="text"
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        placeholder="링크 제목"
        className={inputClass(false)}
      />
      <input
        type="text"
        value={item.href}
        onChange={(e) => onChange({ ...item, href: e.target.value })}
        placeholder="/blog/health-tips/example"
        className={inputClass(false)}
      />
      <textarea
        value={item.description ?? ""}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        rows={2}
        placeholder="링크 설명 (선택)"
        className={`${inputClass(false)} resize-y`}
      />
    </div>
  );
}
