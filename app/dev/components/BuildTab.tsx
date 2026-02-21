"use client";

import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import { NEXTJS_CONFIG } from "@/lib/dev-data";
import { StatCard } from "@/app/admin/(dashboard)/components/StatCard";
import { DataTable } from "@/app/admin/(dashboard)/components/DataTable";

// -------------------------------------------------------------
// 렌더링 전략 배지 색상
// -------------------------------------------------------------

const RENDERING_STYLES: Record<string, string> = {
  SSG: "bg-green-100 text-green-700",
  "SSG+ISR": "bg-blue-100 text-blue-700",
  Client: "bg-yellow-100 text-yellow-700",
  Server: "bg-purple-100 text-purple-700",
};

const TYPE_STYLES: Record<string, string> = {
  page: "bg-sky-100 text-sky-700",
  api: "bg-orange-100 text-orange-700",
};

// -------------------------------------------------------------
// 빌드 & 번들 탭
// -------------------------------------------------------------

export function BuildTab() {
  const { routes, routeStats, projectStats } = DEV_MANIFEST;

  const routeColumns = [
    { key: "path", label: "경로", sortable: true },
    {
      key: "type",
      label: "타입",
      align: "center" as const,
      render: (row: Record<string, unknown>) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[row.type as string] ?? "bg-gray-100 text-gray-700"}`}
        >
          {row.type as string}
        </span>
      ),
    },
    {
      key: "rendering",
      label: "렌더링",
      align: "center" as const,
      render: (row: Record<string, unknown>) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RENDERING_STYLES[row.rendering as string] ?? "bg-gray-100 text-gray-700"}`}
        >
          {row.rendering as string}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 렌더링 전략 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(routeStats.byRendering).map(([key, count]) => (
          <StatCard key={key} label={key} value={count as number} />
        ))}
        <StatCard label="API" value={routeStats.totalApi} color="text-purple-600" />
      </div>

      {/* 프로젝트 구조 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="총 파일" value={projectStats.totalFiles} variant="elevated" />
        <StatCard label="컴포넌트" value={projectStats.components} color="text-sky-600" />
        <StatCard label="lib 모듈" value={projectStats.libModules} color="text-emerald-600" />
        <StatCard label="hooks" value={projectStats.hooks} color="text-orange-600" />
        <StatCard label="블로그 포스트" value={projectStats.blogPosts} color="text-purple-600" />
      </div>

      {/* Next.js & Cloud Run 설정 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Next.js 설정
          </h3>
          <ul className="space-y-1.5 text-sm">
            <li className="text-[var(--muted)]">
              프레임워크: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.framework}</strong>
            </li>
            <li className="text-[var(--muted)]">
              출력 모드: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.output}</strong>
            </li>
            <li className="text-[var(--muted)]">
              배포: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.deployment}</strong>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Cloud Run 스펙
          </h3>
          <ul className="space-y-1.5 text-sm">
            <li className="text-[var(--muted)]">
              인스턴스: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.cloudRun.minInstances}–{NEXTJS_CONFIG.cloudRun.maxInstances}</strong>
            </li>
            <li className="text-[var(--muted)]">
              동시성: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.cloudRun.concurrency}</strong>
            </li>
            <li className="text-[var(--muted)]">
              CPU: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.cloudRun.cpu}vCPU</strong> / 메모리: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.cloudRun.memoryMiB}MB</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* 보안 헤더 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          보안 헤더 ({NEXTJS_CONFIG.securityHeaders.length}개)
        </h3>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {NEXTJS_CONFIG.securityHeaders.map((header) => (
            <li key={header} className="flex items-center gap-1.5 text-sm">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-[var(--foreground)]">{header}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 라우트 테이블 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          라우트 목록 ({routes.length}개)
        </h3>
        <DataTable
          columns={routeColumns}
          rows={routes as unknown as Record<string, unknown>[]}
          keyField="path"
        />
      </div>
    </div>
  );
}
