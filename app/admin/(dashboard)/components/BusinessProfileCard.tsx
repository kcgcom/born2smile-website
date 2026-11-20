import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import type { BusinessProfilePerformance } from "@/lib/admin-business-profile";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi } from "./useAdminApi";

const COUNT = new Intl.NumberFormat("ko-KR");
const CHANGE = new Intl.NumberFormat("ko-KR", { signDisplay: "exceptZero" });

export function BusinessProfileCard() {
  const { data, loading, error, refetch } = useAdminApi<BusinessProfilePerformance>("/api/admin/business-profile");

  return (
    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-900">구글 지도·병원 프로필</h2>
      {error ? (
        <div className="mt-3"><AdminErrorState message={error} onRetry={refetch} /></div>
      ) : loading ? (
        <p role="status" className="mt-3 text-sm text-slate-600">병원 프로필 성과 확인 중…</p>
      ) : data?.configured ? (
        <>
          <p className="mt-2 text-xs text-slate-600">
            최근 28일 {data.start} ~ {data.end} · 직전 28일 {data.previousStart} ~ {data.previousEnd}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.metrics.map(({ label, current, previous }) => (
              <li key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {current === null ? "데이터 없음" : COUNT.format(current)}
                </p>
                <p className="mt-1 text-xs tabular-nums text-slate-600">
                  직전 {previous === null ? "데이터 없음" : COUNT.format(previous)}
                  {current !== null && previous !== null && ` · 증감 ${CHANGE.format(current - previous)}`}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            출처 Google Business Profile · 전화 버튼을 누른 횟수이며 실제 통화·예약 완료는 별도 집계가 필요합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminActionLink tone="dark" href="/admin/analysis/traffic">홈페이지 방문 보기</AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/operations/conversion">홈페이지 문의 시도 보기</AdminActionLink>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Google Business Profile API 연결 설정이 필요합니다.</p>
      )}
    </AdminSurface>
  );
}
