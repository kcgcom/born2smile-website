"use client";

import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getTodayKST } from "@/lib/date";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi } from "../useAdminApi";

const MY_REVISIONS_ENDPOINT = "/api/admin/content-revisions?scope=mine";

interface StaffRevision {
  id: string;
  slug: string;
  title: string | null;
  status: "draft" | "applied";
  created_at: string;
}

export function StaffRevisionList() {
  const { data, loading, error, refetch } = useAdminApi<StaffRevision[]>(MY_REVISIONS_ENDPOINT);

  return (
    <AdminSurface tone="white" className="p-4 sm:p-6">
      <section id="my-revisions" aria-labelledby="my-revisions-title">
        <h2 id="my-revisions-title" className="text-lg font-semibold">내 수정안</h2>
        {loading && <p role="status" className="mt-2 text-sm text-slate-600">수정안을 불러오는 중…</p>}
        {error && <AdminErrorState message={error} onRetry={refetch} />}
        {!error && data?.length === 0 && <p className="mt-2 text-sm text-slate-600">보낸 수정안이 없습니다.</p>}
        {!error && !!data?.length && (
          <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto" tabIndex={0} aria-label="최근 수정안">
            {data.map((revision) => (
              <li key={revision.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{revision.title || revision.slug}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    제출일 <time dateTime={revision.created_at}>{getTodayKST(new Date(revision.created_at))}</time>
                  </p>
                </div>
                <AdminPill tone={revision.status === "applied" ? "success" : "warning"}>
                  {revision.status === "applied" ? "반영 완료" : "검토 대기"}
                </AdminPill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminSurface>
  );
}
