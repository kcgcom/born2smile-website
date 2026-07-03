"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import type { BlogBlock, BlogCategorySlug, BlogTag } from "@/lib/blog/types";
import { normalizeBlogCategory } from "@/lib/blog";
import { getAccessToken } from "@/lib/supabase";
import { emptyBlock } from "./block-editors";

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

interface UseBlogEditorFormOptions {
  mode: "create" | "edit";
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
      if (block.type === "image" && !block.src.trim()) {
        errors[`block_${i}`] = `블록 ${i + 1} 이미지 경로를 확인해 주세요`;
      }
      if (block.type === "relatedLinks" && block.items.some((item) => item.title.length < 2 || item.href.length < 1)) {
        errors[`block_${i}`] = `블록 ${i + 1} 관련 링크 정보를 확인해 주세요`;
      }
      if (block.type === "table") {
        const hasInvalidHeader = block.headers.some((header) => header.trim().length < 1);
        const hasInvalidRow = block.rows.some((row) => (
          row.length !== block.headers.length || row.some((cell) => cell.trim().length < 1)
        ));
        if (hasInvalidHeader || hasInvalidRow) {
          errors[`block_${i}`] = `블록 ${i + 1} 표의 헤더와 셀 내용을 확인해 주세요`;
        }
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
      case "image":
        return block.hidden ? sum : sum + (block.caption?.length ?? 0);
      case "list":
        return sum + block.items.reduce((acc, item) => acc + item.length, 0);
      case "faq":
        return sum + block.question.length + block.answer.length;
      case "relatedLinks":
        return sum + block.items.reduce(
          (acc, item) => acc + item.title.length + item.href.length + (item.description?.length ?? 0),
          0,
        );
      case "table":
        return sum + block.headers.reduce((acc, item) => acc + item.length, 0)
          + block.rows.reduce(
            (rowAcc, row) => rowAcc + row.reduce((cellAcc, cell) => cellAcc + cell.length, 0),
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
// Hook
// -------------------------------------------------------------

export function useBlogEditorForm({ mode, initialData, onSave, onPublish }: UseBlogEditorFormOptions) {
  const today = new Date().toISOString().slice(0, 10);
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
  const [publishing, setPublishing] = useState(false);
  const isPublishedPost = mode === "edit" && form.published;
  const saveButtonLabel = mode === "create"
    ? "초안 저장"
    : isPublishedPost
      ? "변경사항 저장"
      : "초안 저장";

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

  const handlePublish = async () => {
    if (!onPublish) return;
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setPublishing(true);
    setSaveError(null);
    const payload = { ...form, blocks: form.blocks };
    const { error } = await onPublish(payload);
    setPublishing(false);
    if (error) setSaveError(error);
  };

  const categoryOptions = BLOG_CATEGORY_SLUGS;

  return {
    form,
    fieldErrors,
    saveError,
    saving,
    fetchingContent,
    publishing,
    isPublishedPost,
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
  };
}
