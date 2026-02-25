"use client";

import { useState } from "react";
import {
  IMPROVEMENT_ITEMS,
  getImprovementStats,
  getSiteConfigStatus,
  type ImprovementStatus,
  type SiteConfigStatus,
} from "@/lib/admin-data";
import { ConfigRow } from "./ConfigRow";
import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";

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
// 우선순위 배지 (Admin 스타일 통일)
// -------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-[var(--background)] text-[var(--muted)]",
  };

  return (
    <span
      className={`inline-block w-20 rounded px-2 py-0.5 text-center text-xs font-semibold ${styles[priority] ?? styles.LOW}`}
    >
      {priority}
    </span>
  );
}

// -------------------------------------------------------------
// 상태 아이콘 (Admin 스타일 통일)
// -------------------------------------------------------------

function StatusIcon({ status }: { status: ImprovementStatus }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "owner-decision") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
    </span>
  );
}

// -------------------------------------------------------------
// 주요 기술 스택 카드
// -------------------------------------------------------------

const KEY_PACKAGES = ["next", "react", "typescript", "tailwindcss", "firebase", "zod"];

function TechStackGrid() {
  const keyDeps = KEY_PACKAGES.map((name) => {
    const dep = DEV_MANIFEST.dependencies.find((d) => d.name === name);
    return { name, version: dep?.version ?? "—" };
  });

  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        기술 스택
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keyDeps.map((d) => (
          <div key={d.name} className="rounded-lg bg-[var(--background)] p-2.5 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">{d.name}</p>
            <p className="text-xs text-[var(--muted)]">{d.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 환경변수 건강 상태 섹션
// -------------------------------------------------------------

function EnvHealthSection() {
  const {
    data: envData,
    loading: envLoading,
    error: envError,
    refetch: envRefetch,
  } = useAdminApi<EnvStatusData>("/api/dev/env-status");

  if (envLoading) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          환경변수 상태
        </h3>
        <AdminLoadingSkeleton variant="table" />
      </div>
    );
  }

  if (envError) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          환경변수 상태
        </h3>
        <AdminErrorState message={envError} onRetry={envRefetch} />
      </div>
    );
  }

  if (!envData) return null;

  const missingVars = envData.variables.filter((v) => !v.configured);
  const missingRequired = missingVars.filter((v) => v.required);
  const hasMissing = missingVars.length > 0;

  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        환경변수 상태
      </h3>

      {/* 요약 카운트 */}
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full ${
            hasMissing ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
          }`}
        >
          {hasMissing ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span className="text-[var(--foreground)]">
          <strong>{envData.summary.configured}/{envData.summary.total}</strong> 설정됨
        </span>
      </div>

      {/* 미설정 필수 환경변수 경고 */}
      {missingRequired.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-semibold text-red-700">
            필수 환경변수 미설정 ({missingRequired.length}건)
          </p>
          <p className="mt-1 text-xs text-red-600">
            {missingRequired.map((v) => v.key).join(", ")}
          </p>
        </div>
      )}

      {/* 미설정 선택 환경변수 */}
      {missingVars.filter((v) => !v.required).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700">
            선택 환경변수 미설정 ({missingVars.filter((v) => !v.required).length}건)
          </p>
          <p className="mt-1 text-xs text-amber-600">
            {missingVars.filter((v) => !v.required).map((v) => v.key).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 프로젝트 현황 탭
// -------------------------------------------------------------

export function ProjectTab() {
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);
  const stats = getImprovementStats();
  const pct = Math.round((stats.done / stats.total) * 100);

  const pendingItems = IMPROVEMENT_ITEMS.filter((i) => i.status === "pending");
  const ownerItems = IMPROVEMENT_ITEMS.filter((i) => i.status === "owner-decision");

  const togglePriority = (priority: string) => {
    setExpandedPriority((prev) => (prev === priority ? null : priority));
  };

  return (
    <div className="space-y-6">
      {/* 개선 항목 현황 */}
      <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
          개선 항목 현황
        </h3>

        {/* 전체 진행률 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">전체 진행률</span>
            <span className="font-semibold text-[var(--foreground)]">
              {stats.done}/{stats.total} ({pct}%)
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 우선순위별 완료율 — 클릭 시 항목 목록 토글 */}
        <div className="mb-4 space-y-1">
          {stats.byPriority.map((bp) => {
            const isExpanded = expandedPriority === bp.priority;
            const items = IMPROVEMENT_ITEMS.filter((i) => i.priority === bp.priority);
            return (
              <div key={bp.priority}>
                <button
                  onClick={() => togglePriority(bp.priority)}
                  aria-expanded={isExpanded}
                  aria-label={`${bp.priority} 우선순위 항목 ${isExpanded ? "접기" : "펼치기"}`}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-[var(--background)]"
                >
                  <PriorityBadge priority={bp.priority} />
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{
                          width: bp.total > 0 ? `${(bp.done / bp.total) * 100}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-[var(--muted)]">
                    {bp.done}/{bp.total}
                  </span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <ul className="mb-2 ml-1 mt-1 space-y-1.5 border-l-2 border-[var(--border)] pl-3">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <StatusIcon status={item.status} />
                        <div className="min-w-0">
                          <p className={`font-medium ${item.status === "done" ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* 미완료 항목 */}
        {pendingItems.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">
              미완료 ({pendingItems.length}건)
            </h4>
            <ul className="space-y-1.5">
              {pendingItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                  <PriorityBadge priority={item.priority} />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 오너 결정 필요 항목 */}
        {ownerItems.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-gold-dark)]">
              오너 결정 필요 ({ownerItems.length}건)
            </h4>
            <ul className="space-y-1.5">
              {ownerItems.map((item) => (
                <li key={item.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
                  <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 환경변수 건강 상태 */}
      <EnvHealthSection />

      {/* 기술 스택 */}
      <TechStackGrid />

      {/* 사이트 설정 상태 */}
      <SiteConfigSection config={getSiteConfigStatus()} />
    </div>
  );
}

// -------------------------------------------------------------
// 사이트 설정 상태
// -------------------------------------------------------------

function SiteConfigSection({ config }: { config: SiteConfigStatus }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        사이트 설정 상태
      </h3>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* SNS 링크 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">SNS 링크</h4>
          <ul className="space-y-2">
            {config.snsLinks.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* Firebase */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Firebase</h4>
          <ul className="space-y-2">
            {config.firebase.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* 환경변수 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">환경변수</h4>
          <ul className="space-y-2">
            {config.env.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
