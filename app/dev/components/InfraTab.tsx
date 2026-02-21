"use client";

import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import {
  FIRESTORE_COLLECTIONS,
  API_ENDPOINTS,
  CACHE_TTLS,
} from "@/lib/dev-data";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { DataTable } from "@/app/admin/(dashboard)/components/DataTable";
import { ConfigRow } from "@/app/admin/(dashboard)/components/ConfigRow";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";

// -------------------------------------------------------------
// HTTP 메서드 배지 색상
// -------------------------------------------------------------

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

// -------------------------------------------------------------
// 환경변수 API 응답 타입
// -------------------------------------------------------------

interface EnvStatusData {
  variables: {
    key: string;
    label: string;
    configured: boolean;
    required: boolean;
    scope: "public" | "private";
  }[];
  summary: {
    total: number;
    configured: number;
    missing: number;
  };
}

// -------------------------------------------------------------
// Firestore & API 인프라 탭
// -------------------------------------------------------------

export function InfraTab() {
  const { firestoreIndexes, firestoreRules } = DEV_MANIFEST;
  const {
    data: envData,
    loading: envLoading,
    error: envError,
    refetch: envRefetch,
  } = useAdminApi<EnvStatusData>("/api/dev/env-status");

  // 인덱스 테이블 columns
  const indexColumns = [
    { key: "collectionGroup", label: "컬렉션" },
    {
      key: "fields",
      label: "필드",
      render: (row: Record<string, unknown>) => {
        const fields = row.fields as { fieldPath: string; order: string }[];
        return (
          <span className="text-sm">
            {fields.map((f) => `${f.fieldPath} (${f.order === "ASCENDING" ? "ASC" : "DESC"})`).join(" + ")}
          </span>
        );
      },
    },
  ];

  // 인덱스 행 데이터 변환
  const indexRows = firestoreIndexes.map((idx, i) => ({
    _id: `idx-${i}`,
    collectionGroup: idx.collectionGroup,
    fields: idx.fields,
  }));

  // API 엔드포인트 테이블 columns
  const apiColumns = [
    { key: "path", label: "경로", sortable: true },
    {
      key: "methods",
      label: "메서드",
      render: (row: Record<string, unknown>) => {
        const methods = row.methods as string[];
        return (
          <span className="flex flex-wrap gap-1">
            {methods.map((m) => (
              <span
                key={m}
                className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${METHOD_STYLES[m] ?? "bg-gray-100 text-gray-700"}`}
              >
                {m}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: "auth",
      label: "인증",
      align: "center" as const,
      render: (row: Record<string, unknown>) =>
        row.auth ? (
          <span className="text-green-600" title="인증 필요">
            <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    { key: "description", label: "설명" },
  ];

  return (
    <div className="space-y-6">
      {/* Firestore 컬렉션 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Firestore 컬렉션 ({FIRESTORE_COLLECTIONS.length}개)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {FIRESTORE_COLLECTIONS.map((col) => (
            <div key={col.name} className="rounded-lg border border-[var(--border)] p-3">
              <p className="font-mono text-sm font-semibold text-[var(--foreground)]">
                {col.name}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                문서 ID: <span className="font-mono">{col.docId}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">접근: {col.access}</p>
              <p className="mt-1 text-xs text-[var(--muted-light)]">{col.purpose}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 복합 인덱스 & 보안 규칙 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 복합 인덱스 */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            복합 인덱스 ({firestoreIndexes.length}개)
          </h3>
          <DataTable
            columns={indexColumns}
            rows={indexRows as unknown as Record<string, unknown>[]}
            keyField="_id"
          />
        </div>

        {/* 보안 규칙 */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            보안 규칙
          </h3>
          <div className="space-y-2">
            {firestoreRules.map((rule) => (
              <div
                key={rule.collection}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="font-mono text-[var(--foreground)]">
                  {rule.collection}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className={rule.read ? "text-green-600" : "text-red-500"}>
                    R:{rule.read ? "O" : "X"}
                  </span>
                  <span className={rule.write ? "text-green-600" : "text-red-500"}>
                    W:{rule.write ? "O" : "X"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {firestoreRules.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {firestoreRules.find((r) => r.note)?.note}
            </p>
          )}
        </div>
      </div>

      {/* API 엔드포인트 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          API 엔드포인트 ({API_ENDPOINTS.length}개)
        </h3>
        <DataTable
          columns={apiColumns}
          rows={API_ENDPOINTS as unknown as Record<string, unknown>[]}
          keyField="path"
        />
      </div>

      {/* 캐시 TTL & 환경변수 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* 캐시 TTL */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            캐시 TTL
          </h3>
          <div className="space-y-2">
            {CACHE_TTLS.map((ttl) => (
              <div
                key={ttl.key}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="font-mono text-[var(--foreground)]">{ttl.key}</span>
                <span className="text-[var(--muted)]">
                  {ttl.seconds.toLocaleString()}초 ({ttl.label})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 환경변수 상태 */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            환경변수 상태
            {envData && (
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                ({envData.summary.configured}/{envData.summary.total} 설정됨)
              </span>
            )}
          </h3>
          {envLoading && <AdminLoadingSkeleton variant="table" />}
          {envError && (
            <AdminErrorState message={envError} onRetry={envRefetch} />
          )}
          {envData && (
            <ul className="space-y-1.5">
              {envData.variables.map((v) => (
                <ConfigRow
                  key={v.key}
                  item={{
                    label: `${v.label}${v.required ? " *" : ""}`,
                    configured: v.configured,
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
