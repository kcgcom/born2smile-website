"use client";

import { useState } from "react";
import { mutate as refreshCache } from "swr";
import { AdminActionButton, AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { renderBlocks } from "@/components/blog/BlogPostRenderer";
import type { RevisionContent } from "@/lib/content-revisions";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";

interface Proposal {
  id: string; slug: string; base_revision: string; original: RevisionContent; candidate: RevisionContent;
  reason: string; status: "draft" | "applied"; created_at: string;
}

export function RevisionReviewScreen({ id }: { id: string }) {
  const proposal = useAdminApi<Proposal>(`/api/admin/content-revisions/${encodeURIComponent(id)}`);
  const source = useAdminApi<{ revision: string; published: boolean; date: string }>(proposal.data ? `/api/admin/blog-posts/${encodeURIComponent(proposal.data.slug)}/source` : "", Boolean(proposal.data));
  const { mutate, loading: applying, error } = useAdminMutation<{ cacheRefreshPending?: boolean }>();
  const [view, setView] = useState<"original" | "candidate">("candidate");
  const [confirmed, setConfirmed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [cachePending, setCachePending] = useState(false);
  if (proposal.loading) return <AdminLoadingSkeleton variant="full" />;
  if (proposal.error || !proposal.data) return <AdminErrorState message={proposal.error ?? "수정안을 찾을 수 없습니다."} onRetry={proposal.refetch} />;
  const item = proposal.data;
  const done = applied || item.status === "applied";
  const conflict = Boolean(source.data && source.data.revision !== item.base_revision);
  const preview = item[view];
  const apply = async () => {
    if (!confirmed || conflict || !source.data || done || applying) return;
    const result = await mutate(`/api/admin/content-revisions/${id}/apply`, "POST", { confirm: true });
    if (result.error) { source.refetch(); return; }
    setApplied(true);
    setCachePending(Boolean(result.data?.cacheRefreshPending));
    void refreshCache("/api/admin/blog-posts").catch(() => {});
    void refreshCache(`/api/admin/blog-posts/${item.slug}`).catch(() => {});
    proposal.refetch();
    source.refetch();
  };
  return <div className="space-y-5">
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <h1 className="text-xl font-bold">콘텐츠 수정안 검토</h1>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.reason}</p>
      <p className="mt-2 text-xs text-slate-500">제안 시점의 원본과 수정안을 비교합니다. 원본이 이후 변경되면 반영할 수 없습니다.</p>
      <div className="mt-4 flex flex-wrap gap-2"><AdminActionLink tone="dark" href={`/admin/content/posts/${encodeURIComponent(item.slug)}`}>원본 글 편집</AdminActionLink><AdminActionLink tone="dark" href="/admin/content/posts">포스트 목록</AdminActionLink></div>
    </AdminSurface>
    {done ? <AdminNotice tone="success">수정안을 반영했습니다.{cachePending && " 공개 캐시 갱신을 다시 확인해 주세요."}</AdminNotice>
      : conflict ? <AdminNotice tone="warning">원본이 변경됐습니다. 최신 원본을 바탕으로 수정안을 다시 작성해 주세요.</AdminNotice>
        : source.error ? <AdminErrorState message={source.error} onRetry={source.refetch} /> : null}
    {error && <AdminNotice tone="error">{error}</AdminNotice>}
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <div role="group" aria-label="수정 전후 보기" className="mb-5 flex gap-2">
        <AdminActionButton tone={view === "original" ? "primary" : "dark"} aria-pressed={view === "original"} onClick={() => setView("original")}>수정 전</AdminActionButton>
        <AdminActionButton tone={view === "candidate" ? "primary" : "dark"} aria-pressed={view === "candidate"} onClick={() => setView("candidate")}>수정 후</AdminActionButton>
      </div>
      <section aria-label={view === "original" ? "수정 전 내용" : "수정 후 내용"}>
        <h2 className="text-2xl font-bold">{preview.title}</h2><p className="mt-2 text-slate-600">{preview.subtitle}</p>
        <p className="mt-3 text-sm text-slate-600">요약: {preview.excerpt}</p>
        <p className="mt-2 text-xs text-slate-500">카테고리: {preview.category} · 태그: {preview.tags.join(", ") || "없음"}</p>
        <div className="mt-6 space-y-5">{renderBlocks(preview.blocks)}</div>
      </section>
    </AdminSurface>
    {!done && <AdminSurface tone="white" className="rounded-2xl p-5">
      <p className="mb-3 text-sm text-slate-700">반영하면 원본 글의 내용이 바뀝니다. 공개 중인 글에는 즉시 반영되며, 초안·예약 상태와 발행 날짜는 유지됩니다.</p>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={applying || conflict} onChange={event => setConfirmed(event.target.checked)} />수정 전후 내용을 검토했으며 원본 반영에 동의합니다.</label>
      <AdminActionButton tone="primary" onClick={apply} disabled={!confirmed || applying || conflict || !source.data || Boolean(source.error)}>{applying ? "반영 중…" : "검토한 수정안 반영"}</AdminActionButton>
    </AdminSurface>}
  </div>;
}
