"use client";

import { useMemo, useRef, useState } from "react";
import { mutate as refreshCache } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { PublishPopup, type PublishMode } from "@/components/admin/PublishPopup";
import BlogEditor, { type BlogEditorData } from "@/app/admin/(dashboard)/components/BlogEditor";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getAdminPreviewUrl, getBlogPostUrl } from "@/lib/blog/category-slugs";
import { normalizeBlogCategory } from "@/lib/blog";
import { getTodayKST } from "@/lib/date";
import { BLOG_EDITOR_DRAFT_KEY, BLOG_EDITOR_PREFILL_KEY } from "./blog-editor-draft";
import { getNextPublishDate } from "./posts-subtab-shared";
import { RevisionList } from "./RevisionList";

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
  date: getTodayKST(),
  blocks: [],
  published: false,
};

export function BlogEditorScreen({ mode, slug }: BlogEditorScreenProps) {
  const { access } = useAdminAuthState();
  const canPublish = access?.isOwner === true;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromSchedule = searchParams.get("from") === "schedule";
  const listQuery = new URLSearchParams(searchParams.get("list") ?? "");
  const listHref = `/admin/content/posts${listQuery.size ? `?${listQuery}` : ""}`;
  const editorQuery = new URLSearchParams();
  if (fromSchedule) editorQuery.set("from", "schedule");
  if (listQuery.size) editorQuery.set("list", listQuery.toString());
  const editorSuffix = editorQuery.size ? `?${editorQuery}` : "";
  const closeHref = fromSchedule ? "/admin/content/schedule" : listHref;
  const today = getTodayKST();
  const { mutate } = useAdminMutation<{ slug: string }>();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishDraft, setPublishDraft] = useState<{
    data: BlogEditorData;
    onPublished: (saved: BlogEditorData) => void;
  } | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("schedule");
  const [publishing, setPublishing] = useState(false);
  const publishTrigger = useRef<HTMLElement | null>(null);

  const {
    data: scheduleData,
    error: scheduleError,
  } = useAdminApi<{ publishDays: number[] }>("/api/admin/site-config/schedule");
  const { data: scheduledPosts, error: scheduledPostsError } = useAdminApi<{ published: boolean; date: string }[]>("/api/admin/blog-posts");
  const recommendedPublishDate = useMemo(
    () => !scheduledPosts || scheduleError || scheduledPostsError ? "" : getNextPublishDate({ publishDays: scheduleData?.publishDays, posts: scheduledPosts, today }),
    [scheduleData?.publishDays, scheduledPosts, scheduleError, scheduledPostsError, today],
  );

  const {
    data: postData,
    loading,
    error,
    refetch,
  } = useAdminApi<EditablePost>(slug ? `/api/admin/blog-posts/${slug}` : "", Boolean(slug && mode === "edit"));
  const proposingRevision = !canPublish && postData?.published === true;
  const source = useAdminApi<EditablePost & { revision: string }>(
    slug ? `/api/admin/blog-posts/${slug}/source` : "",
    proposingRevision,
  );

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

    if (typeof window !== "undefined" && searchParams.get("prefill") === "brief") {
      const raw = window.sessionStorage.getItem(BLOG_EDITOR_PREFILL_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<EditablePost>;
          nextData = {
            ...nextData,
            ...parsed,
            category: normalizeBlogCategory(parsed.category ?? "") ?? category,
            tags: Array.isArray(parsed.tags) ? parsed.tags : nextData.tags,
            blocks: Array.isArray(parsed.blocks) ? parsed.blocks : nextData.blocks,
          };
          window.sessionStorage.removeItem(BLOG_EDITOR_PREFILL_KEY);
        } catch {
          window.sessionStorage.removeItem(BLOG_EDITOR_PREFILL_KEY);
        }
      }
    }

    return nextData;
  }, [mode, searchParams]);

  const initialData = useMemo(() => {
    if (mode === "edit") {
      return (proposingRevision ? source.data : postData) ?? undefined;
    }
    return draftInitialData ?? undefined;
  }, [draftInitialData, mode, postData, proposingRevision, source.data]);

  const handleSave = async (data: BlogEditorData, baseRevision?: string) => {
    setSaveNotice(null);

    if (mode === "edit" && slug) {
      if (proposingRevision) {
        if (!source.data || !baseRevision) return { error: "원본 글을 다시 불러와 주세요." };
        const { title, subtitle, excerpt, category, tags, blocks } = data;
        const { error: revisionError } = await mutate("/api/admin/content-revisions", "POST", {
          slug,
          baseRevision,
          reason: `${source.data.title} 수정 검토 요청`,
          candidate: { title, subtitle, excerpt, category, tags, blocks },
        });
        if (!revisionError) {
          void refreshCache("/api/admin/publication-review").catch(() => {});
          router.push("/admin/content/review");
        }
        return { error: revisionError };
      }
      const { error: saveError } = await mutate(`/api/admin/blog-posts/${slug}`, "PUT", data);
      if (!saveError) {
        void refreshCache("/api/admin/blog-posts").catch(() => {});
        setSaveNotice(data.published ? "발행된 글을 수정했습니다." : "초안을 저장했습니다.");
        if (data.slug !== slug) {
          router.replace(`/admin/content/posts/${data.slug}${editorSuffix}`);
        } else {
          refetch();
        }
      }
      return { error: saveError };
    }

    const { error: saveError } = await mutate("/api/admin/blog-posts", "POST", data);
    if (!saveError) {
      void refreshCache("/api/admin/blog-posts").catch(() => {});
      window.sessionStorage.removeItem(BLOG_EDITOR_DRAFT_KEY);
      setSaveNotice(data.published ? "새 포스트를 발행했습니다." : "새 포스트 초안을 저장했습니다.");
      router.replace(`/admin/content/posts/${data.slug}`);
    }
    return { error: saveError };
  };

  const requestReview = async (data: BlogEditorData) => {
    const saved = await handleSave(data);
    if (saved.error || proposingRevision) return saved;
    const { error: reviewError } = await mutate("/api/admin/publication-review", "POST", { slug: data.slug });
    if (reviewError) return { error: reviewError };
    void refreshCache("/api/admin/publication-review").catch(() => {});
    router.push("/admin/content/review");
    return { error: null };
  };

  const handlePublish = async (
    data: BlogEditorData,
    onPublished: (saved: BlogEditorData) => void,
  ) => {
    publishTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSaveNotice(null);
    setPublishError(recommendedPublishDate ? null : "발행 일정을 확인할 수 없습니다. 다시 시도하거나 날짜를 직접 선택해 주세요.");
    setPublishDraft({ data, onPublished });
    setPublishMode("schedule");
    setPublishDate(recommendedPublishDate);
    return { error: null };
  };

  const handlePublishConfirm = async () => {
    if (!publishDraft || !publishDate || publishing) return;

    setPublishing(true);
    setPublishError(null);

    const payload = {
      ...publishDraft.data,
      published: true,
      date: publishDate,
    };

    const targetSlug = slug ?? publishDraft.data.slug;
    const method = mode === "edit" ? "PUT" : "POST";
    const endpoint = mode === "edit" && targetSlug
      ? `/api/admin/blog-posts/${targetSlug}`
      : "/api/admin/blog-posts";
    const { error: saveError } = await mutate(endpoint, method, payload);

    setPublishing(false);

    if (saveError) {
      setPublishError(saveError);
      return;
    }

    // The mutation response only contains the slug. The accepted payload is the
    // saved editor snapshot; notify the form only after the write succeeds.
    publishDraft.onPublished(payload);
    void refreshCache("/api/admin/blog-posts").catch(() => {});
    void refreshCache("/api/admin/publication-review").catch(() => {});
    window.sessionStorage.removeItem(BLOG_EDITOR_DRAFT_KEY);
    setPublishDraft(null);
    if (mode === "edit") refetch();
    setSaveNotice(publishDate <= today ? "포스트를 발행했습니다." : `포스트 발행을 예약했습니다. (${publishDate})`);
    router.replace(`/admin/content/posts/${payload.slug}${editorSuffix}`);
  };

  const previewCategory = mode === "edit" && postData ? normalizeBlogCategory(postData.category) : null;
  const previewHref = postData?.slug && previewCategory
    ? getAdminPreviewUrl(postData.slug, previewCategory)
    : null;
  const savedPost = mode === "edit" ? postData : null;
  const isPublic = Boolean(savedPost?.published && savedPost.date <= today);
  const isScheduled = Boolean(savedPost?.published && savedPost.date > today);

  if (mode === "edit" && (loading || (proposingRevision && source.loading))) {
    return <AdminLoadingSkeleton variant="full" />;
  }

  if (mode === "edit" && error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }
  if (proposingRevision && !source.data) {
    return <AdminErrorState message={source.error ?? "원본 글을 불러올 수 없습니다."} onRetry={source.refetch} />;
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
              {canPublish ? "내용을 확인하고 초안을 저장한 뒤 미리보기와 발행 설정을 진행하세요." : "원고를 작성하거나 수정한 뒤 원장에게 검토를 요청할 수 있습니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fromSchedule && <AdminActionLink tone="dark" href="/admin/content/schedule"><ArrowLeft className="h-4 w-4" />발행 일정으로 돌아가기</AdminActionLink>}
            <AdminActionLink tone="dark" href={listHref}>
              <ArrowLeft className="h-4 w-4" />
              포스트 목록
            </AdminActionLink>
            {previewHref && (
              <AdminActionLink tone="dark" href={previewHref}>
                <ExternalLink className="h-4 w-4" />
                미리보기
              </AdminActionLink>
            )}
            {isPublic && savedPost && previewCategory && (
              <AdminActionLink tone="dark" href={getBlogPostUrl(savedPost.slug, previewCategory)} target="_blank" rel="noopener noreferrer">
                공개 페이지 (새 창)
              </AdminActionLink>
            )}
            {isPublic && savedPost && (
              <AdminActionLink tone="dark" href={`/admin/content/posts?performance=${encodeURIComponent(savedPost.slug)}`}>
                포스트 성과
              </AdminActionLink>
            )}
          </div>
        </div>

        <section aria-label="저장된 발행 상태" className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <AdminPill tone={isPublic ? "success" : "warning"}>
            {!savedPost ? "저장 전" : isScheduled ? "발행 예약" : isPublic ? "공개 중" : "초안"}
          </AdminPill>
          <p className="mt-2">
            {!canPublish && proposingRevision ? "수정안을 보내면 원장이 검토 후 반영할 수 있습니다."
              : !canPublish && savedPost ? "초안을 저장하거나 원장에게 발행 검토를 요청할 수 있습니다."
              : !savedPost ? "초안을 먼저 저장하면 저장된 글을 미리볼 수 있습니다."
              : isScheduled ? `${savedPost.date} 공개 예정입니다. 아래 발행일을 수정하고 변경사항을 저장하면 예약일이 바뀝니다.`
                : isPublic ? "변경사항을 저장하면 공개 중인 글에 바로 반영됩니다."
                  : "아직 공개되지 않은 글입니다. 본문을 검토한 뒤 하단의 저장 후 발행에서 공개 날짜를 선택하세요."}
          </p>
          {savedPost && <p className="mt-2 text-xs text-slate-500">미리보기는 마지막으로 저장한 내용을 보여줍니다. 편집한 내용은 먼저 저장해 주세요.</p>}
        </section>

        {saveNotice && (
          <AdminNotice tone="success" className="mt-4">
            {saveNotice}
          </AdminNotice>
        )}
      </AdminSurface>

      {mode === "edit" && slug && <RevisionList slug={slug} />}
      <BlogEditor
        key={`${slug ?? "new"}-${proposingRevision}`}
        mode={mode}
        presentation="page"
        initialData={initialData}
        onSave={handleSave}
        onPublish={canPublish ? handlePublish : undefined}
        onReview={!canPublish && mode === "edit" && !proposingRevision ? requestReview : undefined}
        revisionOnly={proposingRevision}
        onClose={() => router.push(closeHref)}
      />

      {publishDraft && (
        <PublishPopup
          postTitle={publishDraft.data.title}
          publishDate={publishDate}
          publishMode={publishMode}
          scheduledDate={recommendedPublishDate}
          publishing={publishing}
          today={today}
          onModeChange={setPublishMode}
          onDateChange={setPublishDate}
          onConfirm={handlePublishConfirm}
          onClose={() => {
            if (publishing) return;
            setPublishDraft(null);
            setPublishError(null);
            // Opening the dialog briefly disables the trigger, so capture it
            // before that render and restore after the dialog's own cleanup.
            requestAnimationFrame(() => publishTrigger.current?.focus());
          }}
          error={publishError}
        />
      )}
    </div>
  );
}
