"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAccessToken } from "@/lib/supabase";
import type { BlogBlock, BlogCategorySlug } from "@/lib/blog";
import dynamic from "next/dynamic";
import type { BlogEditorData } from "@/app/admin/(dashboard)/components/BlogEditor";

const BlogEditor = dynamic(() => import("@/app/admin/(dashboard)/components/BlogEditor"), { ssr: false });

interface InlineBlogEditButtonProps {
  post: {
    slug: string;
    title: string;
    subtitle: string;
    excerpt: string;
    category: BlogCategorySlug;
    tags: string[];
    date: string;
    content?: { heading: string; content: string }[];
    blocks?: BlogBlock[];
  };
}

export function InlineBlogEditButton({ post }: InlineBlogEditButtonProps) {
  const isAdmin = useAdminAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const handleSave = async (data: BlogEditorData): Promise<{ error: string | null }> => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/blog-posts/${post.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ message: "포스트를 수정할 수 없습니다" }));
        return { error: json.message ?? "포스트를 수정할 수 없습니다" };
      }

      setOpen(false);
      router.refresh();
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "포스트를 수정할 수 없습니다",
      };
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        aria-label="제목·요약·카테고리 등 글 정보 수정"
        title="제목·요약·카테고리 등 글 정보 수정"
      >
        <Pencil size={14} aria-hidden="true" />
        글 정보 수정
      </button>

      {open && (
        <BlogEditor
          mode="edit"
          initialData={{
            slug: post.slug,
            title: post.title,
            subtitle: post.subtitle,
            excerpt: post.excerpt,
            category: post.category,
            tags: post.tags,
            date: post.date,
            content: post.content,
            blocks: post.blocks,
            published: true,
          }}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
