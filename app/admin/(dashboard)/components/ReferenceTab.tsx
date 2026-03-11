"use client";

import { useState } from "react";
import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import {
  ESLINT_CONFIG,
  NEXTJS_CONFIG,
  DATABASE_TABLES,
  API_ENDPOINTS,
  CACHE_TTLS,
} from "@/lib/dev-data";
import { StatCard } from "@/app/admin/(dashboard)/components/StatCard";
import { DataTable } from "@/app/admin/(dashboard)/components/DataTable";

// -------------------------------------------------------------
// 배지 스타일 상수
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

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

// -------------------------------------------------------------
// 아코디언 섹션
// -------------------------------------------------------------

function AccordionSection({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface)] shadow-sm">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--background)] rounded-xl"
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">{summary}</span>
          <svg
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 1. 의존성 섹션
// -------------------------------------------------------------

const KEY_PACKAGES = ["next", "react", "typescript", "tailwindcss", "firebase", "zod"];

function DependenciesContent() {
  const { dependencies, dependencyStats } = DEV_MANIFEST;

  const keyDeps = KEY_PACKAGES.map((name) => {
    const dep = dependencies.find((d) => d.name === name);
    return { name, version: dep?.version ?? "—" };
  });

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
    <div className="space-y-4">
      {/* 주요 기술 스택 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {keyDeps.map((d) => (
          <div key={d.name} className="rounded-lg bg-[var(--background)] p-2.5 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">{d.name}</p>
            <p className="text-xs text-[var(--muted)]">{d.version}</p>
          </div>
        ))}
      </div>

      {/* 패키지 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="총 패키지" value={dependencyStats.total} variant="elevated" />
        <StatCard label="Production" value={dependencyStats.prod} color="text-green-600" variant="elevated" />
        <StatCard label="Dev" value={dependencyStats.dev} color="text-purple-600" variant="elevated" />
      </div>

      {/* 전체 의존성 테이블 */}
      <DataTable
        columns={columns}
        rows={dependencies as unknown as Record<string, unknown>[]}
        keyField="name"
      />
    </div>
  );
}

// -------------------------------------------------------------
// 2. TypeScript & ESLint 섹션
// -------------------------------------------------------------

function TsEslintContent() {
  const { tsConfig } = DEV_MANIFEST;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* TypeScript 설정 */}
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          TypeScript 설정
        </h4>
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
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          ESLint 설정
        </h4>
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
  );
}

// -------------------------------------------------------------
// 3. 라우트 & 렌더링 섹션
// -------------------------------------------------------------

function RoutesContent() {
  const { routes, routeStats, projectStats } = DEV_MANIFEST;

  const routeColumns = [
    { key: "path", label: "경로", sortable: true },
    {
      key: "type",
      label: "타입",
      align: "center" as const,
      render: (row: Record<string, unknown>) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[row.type as string] ?? "bg-[var(--background)] text-[var(--foreground)]"}`}
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
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RENDERING_STYLES[row.rendering as string] ?? "bg-[var(--background)] text-[var(--foreground)]"}`}
        >
          {row.rendering as string}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 렌더링 전략 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="페이지" value={routeStats.totalPages} variant="elevated" />
        <StatCard label="API" value={routeStats.totalApi} color="text-purple-600" />
        {Object.entries(routeStats.byRendering)
          .filter(([key]) => key !== "Server")
          .map(([key, count]) => (
            <StatCard key={key} label={key} value={count as number} />
          ))}
      </div>

      {/* 프로젝트 구조 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="총 파일" value={projectStats.totalFiles} variant="elevated" />
        <StatCard label="컴포넌트" value={projectStats.components} color="text-sky-600" />
        <StatCard label="lib 모듈" value={projectStats.libModules} color="text-emerald-600" />
        <StatCard label="hooks" value={projectStats.hooks} color="text-orange-600" />
        <StatCard label="블로그 포스트" value={projectStats.blogPosts} color="text-purple-600" />
      </div>

      {/* 라우트 테이블 */}
      <DataTable
        columns={routeColumns}
        rows={routes as unknown as Record<string, unknown>[]}
        keyField="path"
      />
    </div>
  );
}

// -------------------------------------------------------------
// 4. 인프라 설정 섹션
// -------------------------------------------------------------

function InfraContent() {
  return (
    <div className="space-y-4">
      {/* Next.js & Vercel 설정 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Next.js 설정
          </h4>
          <ul className="space-y-1.5 text-sm">
            <li className="text-[var(--muted)]">
              프레임워크: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.framework}</strong>
            </li>
            <li className="text-[var(--muted)]">
              배포: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.deployment}</strong>
            </li>
            <li className="text-[var(--muted)]">
              리전: <strong className="text-[var(--foreground)]">{NEXTJS_CONFIG.region}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* 보안 헤더 */}
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          보안 헤더 ({NEXTJS_CONFIG.securityHeaders.length}개)
        </h4>
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
    </div>
  );
}

// -------------------------------------------------------------
// 5. 데이터베이스 섹션 (Supabase)
// -------------------------------------------------------------

function DatabaseContent() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          테이블 ({DATABASE_TABLES.length}개) — Supabase PostgreSQL
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {DATABASE_TABLES.map((tbl) => (
            <div key={tbl.name} className="rounded-lg border border-[var(--border)] p-3">
              <p className="font-mono text-sm font-semibold text-[var(--foreground)]">
                {tbl.name}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                PK: <span className="font-mono">{tbl.primaryKey}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">접근: {tbl.access}</p>
              <p className="mt-1 text-xs text-[var(--muted-light)]">{tbl.purpose}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. API & 캐시 섹션
// -------------------------------------------------------------

function ApiCacheContent() {
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
                className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${METHOD_STYLES[m] ?? "bg-[var(--background)] text-[var(--foreground)]"}`}
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
          <span className="text-[var(--muted-light)]">—</span>
        ),
    },
    { key: "description", label: "설명" },
  ];

  return (
    <div className="space-y-4">
      {/* API 엔드포인트 */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          API 엔드포인트 ({API_ENDPOINTS.length}개)
        </h4>
        <DataTable
          columns={apiColumns}
          rows={API_ENDPOINTS as unknown as Record<string, unknown>[]}
          keyField="path"
        />
      </div>

      {/* 캐시 TTL */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          캐시 TTL
        </h4>
        <div className="space-y-2">
          {CACHE_TTLS.map((ttl) => (
            <div
              key={ttl.key}
              className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-2 text-sm"
            >
              <span className="font-mono text-[var(--foreground)]">{ttl.key}</span>
              <span className="text-[var(--muted)]">
                {ttl.seconds.toLocaleString()}초 ({ttl.label})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 레퍼런스 탭 메인
// -------------------------------------------------------------

export function ReferenceTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { dependencies, routes } = DEV_MANIFEST;

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const sections = [
    {
      id: "dependencies",
      title: "의존성",
      summary: `${dependencies.length}개`,
      content: <DependenciesContent />,
    },
    {
      id: "ts-eslint",
      title: "TypeScript & ESLint",
      summary: "설정 요약",
      content: <TsEslintContent />,
    },
    {
      id: "routes",
      title: "라우트 & 렌더링",
      summary: `${routes.length}개`,
      content: <RoutesContent />,
    },
    {
      id: "infra",
      title: "인프라 설정",
      summary: "Next.js / Vercel",
      content: <InfraContent />,
    },
    {
      id: "database",
      title: "데이터베이스",
      summary: `Supabase ${DATABASE_TABLES.length}개 테이블`,
      content: <DatabaseContent />,
    },
    {
      id: "api-cache",
      title: "API & 캐시",
      summary: `${API_ENDPOINTS.length}개 엔드포인트`,
      content: <ApiCacheContent />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* 개발자 빠른 링크 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Vercel", href: "https://vercel.com/born2smile/born2smile-website" },
          { label: "GitHub", href: "https://github.com/kcgcom/born2smile-website" },
          { label: "Analytics", href: "https://analytics.google.com/" },
          { label: "Search Console", href: "https://search.google.com/search-console?resource_id=sc-domain:born2smile.co.kr" },
          { label: "Supabase", href: "https://supabase.com/dashboard/project/wnxsrxqmzevboyoityyn" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {link.label}
            <svg className="h-3 w-3 text-[var(--muted)]" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ))}
      </div>

      {sections.map((section) => (
        <AccordionSection
          key={section.id}
          title={section.title}
          summary={section.summary}
          expanded={expanded === section.id}
          onToggle={() => toggle(section.id)}
        >
          {section.content}
        </AccordionSection>
      ))}
    </div>
  );
}
