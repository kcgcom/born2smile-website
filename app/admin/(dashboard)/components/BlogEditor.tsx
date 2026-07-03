"use client";

import { X, Trash2, Save, Copy, Send } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { BLOG_TAGS } from "@/lib/blog/types";
import type { BlogBlock, BlogCategorySlug } from "@/lib/blog/types";
import { getCategoryLabel } from "@/lib/blog";
import { inputClass, emptyBlock, BLOCK_LABELS, BlockEditorRenderer } from "./blog/block-editors";
import { useBlogEditorForm } from "./blog/useBlogEditorForm";
import type { BlogEditorData } from "./blog/useBlogEditorForm";

export type { BlogEditorData };

// -------------------------------------------------------------
// BlogEditor component
// -------------------------------------------------------------

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
  onPublish?: (data: BlogEditorData) => Promise<{ error: string | null }>;
  onClose: () => void;
}

export default function BlogEditor({
  mode,
  presentation = "drawer",
  initialData,
  onSave,
  onPublish,
  onClose,
}: BlogEditorProps) {
  const isPage = presentation === "page";

  const {
    form,
    fieldErrors,
    saveError,
    saving,
    fetchingContent,
    publishing,
    saveButtonLabel,
    readTime,
    categoryOptions,
    setField,
    setBlock,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
    toggleTag,
    handleSubmit,
    handlePublish,
  } = useBlogEditorForm({ mode, initialData, onSave, onPublish });

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
                  <BlockEditorRenderer
                    block={block}
                    idx={idx}
                    setBlock={setBlock}
                    fieldErrors={fieldErrors}
                    uploadContext={{ category: form.category, slug: form.slug }}
                  />
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
            onClick={onClose}
            disabled={saving || publishing}
            tone="dark"
            className="w-full px-5 sm:w-auto"
          >
            취소
          </AdminActionButton>
          {onPublish && mode === "edit" && !form.published && (
            <AdminActionButton
              type="button"
              onClick={handlePublish}
              disabled={saving || publishing || fetchingContent}
              tone="dark"
              className="w-full px-5 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {publishing ? "발행 중..." : "저장 후 발행"}
            </AdminActionButton>
          )}
          <AdminActionButton
            type="button"
            onClick={handleSubmit}
            disabled={saving || publishing || fetchingContent}
            tone="primary"
            className="w-full px-5 sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : saveButtonLabel}
          </AdminActionButton>
        </div>
      </AdminSurface>
    </div>
  );
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

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
