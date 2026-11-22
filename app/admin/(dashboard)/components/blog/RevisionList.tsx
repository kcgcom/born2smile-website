"use client";

import { useWorkspaceHref } from "@/hooks/useWorkspaceHref";

import { AdminActionLink } from "@/components/admin/AdminChrome";
import { useAdminApi } from "../useAdminApi";

export function RevisionList({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const workspaceHref = useWorkspaceHref();
  const { data, loading, error, refetch } = useAdminApi<{ id: string; reason: string; status: string }[]>(`/api/admin/content-revisions?slug=${encodeURIComponent(slug)}`);
  return <details className={`rounded-2xl border border-slate-200 bg-white p-4 ${compact ? "lg:rounded-none lg:border-0 lg:p-0" : ""}`}>
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-slate-800">에이전트 수정안</summary>
    {loading ? <p role="status" className="mt-3 text-sm">수정안을 불러오는 중…</p>
      : error ? <p role="status" className="mt-3 text-sm text-red-700">수정안을 불러오지 못했습니다. <button type="button" className="underline" onClick={refetch}>다시 시도</button></p>
        : Array.isArray(data) && data.length ? <ul className="mt-3 space-y-2">{data.map(item => <li key={item.id}><AdminActionLink tone="dark" href={workspaceHref(`/admin/content/revisions/${item.id}`)}>{item.status === "applied" ? "반영됨" : "검토 대기"} · {item.reason}</AdminActionLink></li>)}</ul>
          : <p className="mt-3 text-sm text-slate-600">저장된 수정안이 없습니다.</p>}
  </details>;
}
