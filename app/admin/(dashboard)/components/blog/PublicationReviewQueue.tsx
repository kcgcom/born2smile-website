"use client";

import { useWorkspaceHref } from "@/hooks/useWorkspaceHref";

import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { revisionHref } from "../planner/work-inbox";
import { useAdminApi } from "../useAdminApi";

interface ReviewQueue {
  drafts: { slug: string; title: string }[];
  revisions: { id: string; slug: string; reason: string }[];
}

export function PublicationReviewQueue({ showDrafts = false, returnTo }: { showDrafts?: boolean; returnTo?: string }) {
  const workspaceHref = useWorkspaceHref();
  const { data, error, loading, refetch } = useAdminApi<ReviewQueue>("/api/admin/publication-review");
  return (
    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      {showDrafts
        ? <h1 className="text-xl font-bold">검토 대기 원고</h1>
        : <h2 id="pending-revisions" className="text-lg font-semibold">검토 대기 수정안</h2>}
      {loading && <p role="status" className="mt-3 text-sm">검토 대기 목록을 불러오는 중…</p>}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {data && !error && (
        <div className={showDrafts ? "mt-4 grid gap-6 sm:grid-cols-2" : "mt-4"}>
          {showDrafts && <section>
            <h2 className="font-semibold">발행 요청</h2>
            {data.drafts.length === 0 && <p className="mt-2 text-sm text-slate-600">대기 중인 원고가 없습니다.</p>}
            <ul className="mt-2 space-y-2">
              {data.drafts.map((draft) => <li key={draft.slug}><AdminActionLink tone="dark" href={workspaceHref(`/admin/content/posts/${draft.slug}`)}>{draft.title}</AdminActionLink></li>)}
            </ul>
          </section>}
          <section>
            {showDrafts && <h2 className="font-semibold">공개·예약 글 수정안</h2>}
            {data.revisions.length === 0 && <p className="mt-2 text-sm text-slate-600">대기 중인 수정안이 없습니다.</p>}
            <ul className="mt-2 space-y-2">
              {data.revisions.map((revision) => <li key={revision.id}><AdminActionLink tone="dark" href={revisionHref(workspaceHref(`/admin/content/revisions/${revision.id}`), returnTo)}>{revision.reason} · {revision.slug}</AdminActionLink></li>)}
            </ul>
          </section>
        </div>
      )}
    </AdminSurface>
  );
}
