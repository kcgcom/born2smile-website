"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import BlogEditor, { type BlogEditorData } from "@/app/admin/(dashboard)/components/BlogEditor";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getAdminPreviewUrl } from "@/lib/blog/category-slugs";
import { normalizeBlogCategory } from "@/lib/blog";
import { BLOG_EDITOR_DRAFT_KEY } from "./blog-editor-draft";

interface BlogEditorScreenProps {
  mode: "create" | "edit";
  slug?: string;
}

interface EditablePost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  blocks: BlogEditorData["blocks"];
  published: boolean;
}

const EMPTY_CREATE_DRAFT: EditablePost = {
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  category: BLOG_CATEGORY_SLUGS[0],
  tags: [],
  date: new Date().toISOString().slice(0, 10),
  blocks: [],
  published: false,
};

export function BlogEditorScreen({ mode, slug }: BlogEditorScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useAdminMutation<{ slug: string }>();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const {
    data: postData,
    loading,
    error,
    refetch,
  } = useAdminApi<EditablePost>(slug ? `/api/admin/blog-posts/${slug}` : "", Boolean(slug && mode === "edit"));

  const draftInitialData = useMemo(() => {
    if (mode !== "create") {
      return null;
    }

    const category = normalizeBlogCategory(searchParams.get("category") ?? "") ?? BLOG_CATEGORY_SLUGS[0];
    let nextData: EditablePost = {
      ...EMPTY_CREATE_DRAFT,
      category,
    };

    if (typeof window !== "undefined" && searchParams.get("draft") === "1") {
      const raw = window.sessionStorage.getItem(BLOG_EDITOR_DRAFT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as EditablePost;
          nextData = { ...nextData, ...parsed, category: normalizeBlogCategory(parsed.category) ?? category };
        } catch {
          window.sessionStorage.removeItem(BLOG_EDITOR_DRAFT_KEY);
        }
      }
    }

    return nextData;
  }, [mode, searchParams]);

  const initialData = useMemo(() => {
    if (mode === "edit") {
      return postData ?? undefined;
    }
    return draftInitialData ?? undefined;
  }, [draftInitialData, mode, postData]);

  const handleSave = async (data: BlogEditorData) => {
    setSaveNotice(null);

    if (mode === "edit" && slug) {
      const { error: saveError } = await mutate(`/api/admin/blog-posts/${slug}`, "PUT", data);
      if (!saveError) {
        setSaveNotice("포스트를 저장했습니다.");
        if (data.slug !== slug) {
          router.replace(`/admin/content/posts/${data.slug}`);
        } else {
          refetch();
        }
      }
      return { error: saveError };
    }

    const { error: saveError } = await mutate("/api/admin/blog-posts", "POST", data);
    if (!saveError) {
      window.sessionStorage.removeItem(BLOG_EDITOR_DRAFT_KEY);
      setSaveNotice("새 포스트를 저장했습니다.");
      router.replace(`/admin/content/posts/${data.slug}`);
    }
    return { error: saveError };
  };

  const previewCategory = initialData ? normalizeBlogCategory(initialData.category) : null;
  const previewHref = initialData?.slug && previewCategory
    ? getAdminPreviewUrl(initialData.slug, previewCategory)
    : null;

  if (mode === "edit" && loading) {
    return <AdminLoadingSkeleton variant="full" />;
  }

  if (mode === "edit" && error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {mode === "create" ? "새 포스트 작성" : "포스트 편집"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              메타 정보, 본문 블록, 발행 상태를 한 화면에서 정리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminActionLink tone="dark" href="/admin/content/posts">
              <ArrowLeft className="h-4 w-4" />
              포스트 목록
            </AdminActionLink>
            {previewHref && (
              <AdminActionLink tone="dark" href={previewHref}>
                <ExternalLink className="h-4 w-4" />
                미리보기
              </AdminActionLink>
            )}
          </div>
        </div>

        {saveNotice && (
          <AdminNotice tone="success" className="mt-4">
            {saveNotice}
          </AdminNotice>
        )}
      </AdminSurface>

      <BlogEditor
        mode={mode}
        presentation="page"
        initialData={initialData}
        onSave={handleSave}
        onClose={() => router.push("/admin/content/posts")}
      />
    </div>
  );
}
