"use client";

import { createContext, useContext, useState } from "react";
import type { BlogBlock } from "@/lib/blog";

// ─── Context ──────────────────────────────────────────────────────────────────

interface BlogEditContextValue {
  isEditMode: boolean;
  enter: () => void;
  exit: () => void;
  /** Latest blocks, kept in sync by InlineBlocksEditor on every block save */
  blocks: BlogBlock[];
  setBlocks: (blocks: BlogBlock[]) => void;
}

const BlogEditContext = createContext<BlogEditContextValue | null>(null);

export function useBlogEditContext(): BlogEditContextValue {
  const ctx = useContext(BlogEditContext);
  if (!ctx) throw new Error("useBlogEditContext must be used within BlogEditProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BlogEditProvider({
  initialBlocks,
  children,
}: {
  initialBlocks: BlogBlock[];
  children: React.ReactNode;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [blocks, setBlocks] = useState<BlogBlock[]>(initialBlocks);

  return (
    <BlogEditContext.Provider
      value={{
        isEditMode,
        enter: () => setIsEditMode(true),
        exit: () => setIsEditMode(false),
        blocks,
        setBlocks,
      }}
    >
      {children}
    </BlogEditContext.Provider>
  );
}
