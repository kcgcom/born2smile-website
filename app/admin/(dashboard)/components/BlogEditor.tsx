"use client";

import React from "react";
import { X, Trash2, Save, Copy, Send } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { DraftRecoveryNotice } from "@/components/admin/DraftRecoveryNotice";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useModalA11y } from "@/hooks/useModalA11y";
import { BLOG_TAGS } from "@/lib/blog/types";
import type { BlogBlock, BlogCategorySlug } from "@/lib/blog/types";
import { getCategoryLabel } from "@/lib/blog";
import { MAX_BLOG_BLOCKS } from "@/lib/blog/normalize-blocks";
import { prepareBlockConversion } from "@/lib/blog/block-editing";
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
  onPublish?: (
    data: BlogEditorData,
    onPublished: (saved: BlogEditorData) => void,
  ) => Promise<{ error: string | null }>;
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
    dirty,
    confirmLeave,
    recoveryNotice,
    hasConflict,
    canRestore,
    restoreConflict,
    discardConflict,
    form,
    fieldErrors,
    validationAttempt,
    saveError,
    saving,
    fetchingContent,
    publishing,
    saveButtonLabel,
    readTime,
    categoryOptions,
    setField,
    setBlock,
    replaceBlocks,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
    toggleTag,
    handleSubmit,
    handlePublish,
  } = useBlogEditorForm({ mode, initialData, onSave, onPublish });

  const handleClose = () => {
    if (!saving && !publishing && confirmLeave()) onClose();
  };
  const modalRef = useModalA11y(handleClose, !isPage);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const saveErrorRef = React.useRef<HTMLDivElement>(null);
  const editorId = React.useId();
  const errorCount = Object.keys(fieldErrors).length;
  const focusFirstError = React.useCallback(() => {
    const field = editorRef.current?.querySelector<HTMLElement>('[data-field-error="true"]');
    if (!field) return;
    const input = field.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?? field.querySelector<HTMLElement>('textarea:not(:disabled), input:not(:disabled)')
      ?? field.querySelector<HTMLElement>('select:not(:disabled), button:not(:disabled)')
      ?? field;
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);

  React.useEffect(() => {
    if (validationAttempt > 0) focusFirstError();
  }, [validationAttempt, focusFirstError]);

  React.useEffect(() => {
    if (!saveError) return;
    saveErrorRef.current?.focus({ preventScroll: true });
    saveErrorRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [saveError]);

  return (
    <div
      ref={(node) => {
        editorRef.current = node;
        if (!isPage) modalRef.current = node;
      }}
      className={isPage ? "space-y-6" : "fixed inset-0 z-50 flex items-stretch justify-end"}
      role={isPage ? undefined : "dialog"}
      aria-modal={isPage ? undefined : true}
      aria-label={mode === "create" ? "새 포스트 작성" : "포스트 수정"}
    >
      {!isPage && (
        <div
          className="absolute inset-0 bg-black/40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <AdminSurface
        tone="white"
        className={`relative z-10 flex w-full flex-col ${
          isPage
            ? "mx-auto max-w-5xl overflow-visible rounded-[2rem] shadow-xl shadow-slate-950/8"
            : "h-full max-w-2xl overflow-hidden rounded-none border-y-0 border-r-0 shadow-2xl"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between rounded-t-[inherit] border-b border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] px-6 py-4 text-white">
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
            onClick={handleClose}
            tone="ghost"
            className="rounded-full border-white/10 bg-white/6 p-2 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </AdminActionButton>
        </div>

        {/* Scrollable body */}
        <div className={`flex-1 space-y-5 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-5 ${isPage ? "" : "overflow-y-auto"}`}>
          {dirty && (
            <AdminNotice tone="warning">저장하지 않은 변경사항이 있습니다.</AdminNotice>
          )}
          <DraftRecoveryNotice recovery={{ hasConflict, canRestore, recoveryNotice, restoreConflict, discardConflict }} />
          <fieldset disabled={hasConflict} className="min-w-0 space-y-5">
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
              hint={mode === "edit" && form.published ? "발행된 포스트의 슬러그는 SEO 보호를 위해 변경할 수 없습니다" : undefined}
            >
              <input
                type="text"
                value={form.slug}
                readOnly={mode === "edit" && form.published}
                onChange={(e) => setField("slug", e.target.value.toLowerCase())}
                placeholder="my-post-slug"
                className={inputClass(!!fieldErrors.slug, mode === "edit" && form.published)}
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

            <div data-field-error={Boolean(fieldErrors.blocks)} tabIndex={-1}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--foreground)]">
                  본문 블록 <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal text-[var(--muted)]">({form.blocks?.length ?? 0}/{MAX_BLOG_BLOCKS})</span>
                </label>
              </div>
              {fieldErrors.blocks && (
                <p className="mb-2 text-xs text-red-500">{fieldErrors.blocks}</p>
              )}
              <div className="space-y-4">
                {form.blocks.map((block, idx) => (
                  <div key={idx} data-field-error={Boolean(fieldErrors[`block_${idx}`])} role="group" aria-label={`본문 블록 ${idx + 1}`} aria-describedby={fieldErrors[`block_${idx}`] ? `${editorId}-block-${idx}-error` : undefined} tabIndex={-1} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
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
                      onChange={(e) => {
                        const result = prepareBlockConversion(block, e.target.value as BlogBlock["type"], emptyBlock);
                        if (result.warning && !window.confirm(result.warning)) return;
                        replaceBlocks(idx, result.blocks);
                      }}
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
                      <p id={`${editorId}-block-${idx}-error`} className="mt-1 text-xs text-red-700">{fieldErrors[`block_${idx}`]}</p>
                    )}
                  </div>
                ))}
              </div>
              {(form.blocks?.length ?? 0) < MAX_BLOG_BLOCKS && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(BLOCK_LABELS) as BlogBlock["type"][]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      + {BLOCK_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </fieldset>

          {/* Save error */}
          {saveError && (
            <div ref={saveErrorRef} tabIndex={-1}>
              <AdminNotice tone="error" className="rounded-lg">{saveError}</AdminNotice>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          role="group"
          aria-label="포스트 저장"
          className={`shrink-0 flex flex-wrap items-center justify-end gap-2 rounded-b-[inherit] border-t border-[var(--border)] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] sm:gap-3 sm:px-6 ${isPage ? "sticky bottom-0 z-20" : ""}`}
        >
          {errorCount > 0 && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm text-red-700">
              <p role="alert">확인이 필요한 입력이 {errorCount}개 있습니다.</p>
              <button type="button" onClick={focusFirstError} className="rounded px-2 py-1 font-medium underline focus-visible:outline-2">첫 오류로 이동</button>
            </div>
          )}
          <AdminActionButton
            type="button"
            onClick={handleClose}
            disabled={saving || publishing}
            tone="dark"
            className="px-3 sm:px-5"
          >
            취소
          </AdminActionButton>
          {onPublish && mode === "edit" && !form.published && (
            <AdminActionButton
              type="button"
              onClick={handlePublish}
              disabled={hasConflict || saving || publishing || fetchingContent}
              tone="dark"
              className="px-3 sm:px-5"
            >
              <Send className="h-4 w-4" />
              {publishing ? "발행 중..." : "저장 후 발행"}
            </AdminActionButton>
          )}
          <AdminActionButton
            type="button"
            onClick={handleSubmit}
            disabled={hasConflict || saving || publishing || fetchingContent}
            tone="primary"
            className="px-3 sm:px-5"
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
  children: React.ReactElement<Record<string, unknown>>;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  const fieldId = React.useId();

  return (
    <div data-field-error={Boolean(error)}>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={fieldId} className="text-sm font-semibold text-[var(--foreground)]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {hint && <span id={`${fieldId}-hint`} className="text-xs text-[var(--muted)]">{hint}</span>}
      </div>
      {React.cloneElement(children, {
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(" ") || undefined,
      })}
      {error && <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
