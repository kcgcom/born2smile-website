"use client";

import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import { ESLINT_CONFIG } from "@/lib/dev-data";
import { StatCard } from "@/app/admin/(dashboard)/components/StatCard";
import { DataTable } from "@/app/admin/(dashboard)/components/DataTable";

// -------------------------------------------------------------
// 코드 품질 & 의존성 탭
// -------------------------------------------------------------

export function CodeQualityTab() {
  const { dependencies, dependencyStats, tsConfig } = DEV_MANIFEST;

  const columns = [
    { key: "name", label: "패키지명", sortable: true },
    { key: "version", label: "버전" },
    {
      key: "isDev",
      label: "구분",
      align: "center" as const,
      render: (row: Record<string, unknown>) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            row.isDev
              ? "bg-purple-100 text-purple-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {row.isDev ? "dev" : "prod"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 패키지 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="총 패키지" value={dependencyStats.total} variant="elevated" />
        <StatCard
          label="Production"
          value={dependencyStats.prod}
          color="text-green-600"
          variant="elevated"
        />
        <StatCard
          label="Dev"
          value={dependencyStats.dev}
          color="text-purple-600"
          variant="elevated"
        />
      </div>

      {/* TypeScript & ESLint 설정 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* TypeScript 설정 */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            TypeScript 설정
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              {tsConfig.strict ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
              <span>strict mode: <strong>{tsConfig.strict ? "활성화" : "비활성화"}</strong></span>
            </li>
            <li className="flex items-center gap-2 text-[var(--muted)]">
              <span className="ml-7">target: <strong className="text-[var(--foreground)]">{tsConfig.target}</strong></span>
            </li>
            <li className="flex items-center gap-2 text-[var(--muted)]">
              <span className="ml-7">moduleResolution: <strong className="text-[var(--foreground)]">{tsConfig.moduleResolution}</strong></span>
            </li>
            {Object.entries(tsConfig.paths).map(([alias, targets]) => (
              <li key={alias} className="flex items-center gap-2 text-[var(--muted)]">
                <span className="ml-7">
                  path alias: <strong className="text-[var(--foreground)]">{alias}</strong> → {(targets as readonly string[]).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ESLint 설정 */}
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            ESLint 설정
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="text-[var(--muted)]">
              설정 파일: <strong className="text-[var(--foreground)]">{ESLINT_CONFIG.configFile}</strong>
            </li>
            <li>
              <span className="text-[var(--muted)]">규칙셋:</span>
              <ul className="ml-4 mt-1 space-y-1">
                {ESLINT_CONFIG.ruleSets.map((rule) => (
                  <li key={rule} className="flex items-center gap-1.5 text-[var(--foreground)]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm">{rule}</span>
                  </li>
                ))}
              </ul>
            </li>
            <li className="text-[var(--muted)]">
              무시 패턴: {ESLINT_CONFIG.ignorePatterns.join(", ")}
            </li>
          </ul>
        </div>
      </div>

      {/* 의존성 테이블 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          의존성 목록 ({dependencies.length}개)
        </h3>
        <DataTable
          columns={columns}
          rows={dependencies as unknown as Record<string, unknown>[]}
          keyField="name"
        />
      </div>
    </div>
  );
}
