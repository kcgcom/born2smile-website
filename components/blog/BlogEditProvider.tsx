"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { BlogBlock } from "@/lib/blog";
import { replaceBlogBlock } from "@/lib/blog/block-editing";

// ─── Context ──────────────────────────────────────────────────────────────────

interface BlogEditContextValue {
  isEditMode: boolean;
  enter: () => Promise<void>;
  exit: () => void;
  /** Latest blocks, kept in sync by InlineBlocksEditor on every block save */
  blocks: BlogBlock[];
  setBlocks: (blocks: BlogBlock[]) => void;
  editLoading: boolean;
  editError: string | null;
  researchNotices: Record<string, string>;
  registerBlockDraft: (index: number, read: () => BlogBlock[]) => () => void;
  getBlocksForSave: () => BlogBlock[];
  beginSave: () => boolean;
  endSave: () => void;
  isSaving: boolean;
}

const BlogEditContext = createContext<BlogEditContextValue | null>(null);

export function useBlogEditContext(): BlogEditContextValue {
  const ctx = useContext(BlogEditContext);
  if (!ctx) throw new Error("useBlogEditContext must be used within BlogEditProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BlogEditProvider({
  slug,
  initialBlocks,
  initialResearchNotices = {},
  children,
}: {
  slug: string;
  initialBlocks: BlogBlock[];
  initialResearchNotices?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<BlogBlock[]>(initialBlocks);
  const [researchNotices, setResearchNotices] = useState(initialResearchNotices);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const inflight = useRef(false);
  const activeDraft = useRef<{ index: number; read: () => BlogBlock[] } | null>(null);
  const saveInFlight = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const registerBlockDraft = useCallback((index: number, read: () => BlogBlock[]) => {
    const entry = { index, read };
    activeDraft.current = entry;
    return () => { if (activeDraft.current === entry) activeDraft.current = null; };
  }, []);
  const getBlocksForSave = () => {
    const active = activeDraft.current;
    return active ? replaceBlogBlock(draftBlocks, active.index, active.read()) : draftBlocks;
  };
  const beginSave = useCallback(() => {
    if (saveInFlight.current) return false;
    saveInFlight.current = true;
    setIsSaving(true);
    return true;
  }, []);
  const endSave = useCallback(() => { saveInFlight.current = false; setIsSaving(false); }, []);

  const enter = async () => {
    if (inflight.current) return;
    inflight.current = true;
    setEditLoading(true);
    setEditError(null);
    try {
      const { getAccessToken } = await import("@/lib/supabase");
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/blog-posts/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok || !Array.isArray(json.data?.blocks)) throw new Error(json.message ?? "편집할 원문을 불러오지 못했습니다.");
      // Public display data may hide private references. Only the authenticated,
      // unmodified document may become the body of a later save request.
      setDraftBlocks(json.data.blocks);
      setResearchNotices(json.researchNotices ?? {});
      setIsEditMode(true);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "원문을 불러오지 못했습니다.");
    } finally {
      inflight.current = false;
      setEditLoading(false);
    }
  };

  return (
    <BlogEditContext.Provider
      value={{
        isEditMode,
        enter,
        exit: () => { activeDraft.current = null; setIsEditMode(false); },
        blocks: isEditMode ? draftBlocks : initialBlocks,
        setBlocks: setDraftBlocks,
        editLoading,
        editError,
        researchNotices: isEditMode ? researchNotices : initialResearchNotices,
        registerBlockDraft,
        getBlocksForSave,
        beginSave,
        endSave,
        isSaving,
      }}
    >
      {children}
    </BlogEditContext.Provider>
  );
}
