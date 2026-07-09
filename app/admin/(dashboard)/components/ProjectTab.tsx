"use client";

import { useState } from "react";
import { Check, AlertTriangle, Circle, ChevronDown, X } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";
import {
  IMPROVEMENT_ITEMS,
  getImprovementStats,
  getSiteConfigStatus,
  type ImprovementStatus,
  type SiteConfigStatus,
} from "@/lib/admin-data";
import { ENV_GROUP_LABELS, type EnvGroup } from "@/lib/dev-data";
import { ConfigRow } from "./ConfigRow";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";

// -------------------------------------------------------------
// 환경변수 API 응답 타입
// -------------------------------------------------------------

interface EnvStatusVariable {
  key: string;
  label: string;
  configured: boolean;
  required: boolean;
  scope: "public" | "private";
  group: EnvGroup;
}

interface EnvStatusData {
  variables: EnvStatusVariable[];
  summary: {
    total: number;
    configured: number;
    missing: number;
  };
}

// -------------------------------------------------------------
// 우선순위 배지 (Admin 스타일 통일)
// -------------------------------------------------------------

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-[var(--background)] text-[var(--muted)]",
  };

  return (
    <span
      className={`inline-block w-14 rounded px-2 py-0.5 text-center text-xs font-semibold ${styles[priority] ?? styles.LOW}`}
    >
      {PRIORITY_LABELS[priority] ?? priority}
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
        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (status === "owner-decision") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <Circle className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true" />
    </span>
  );
}

// -------------------------------------------------------------
// 환경변수 건강 상태 섹션
// -------------------------------------------------------------

function EnvHealthSection() {
  const [expanded, setExpanded] = useState(false);
  const {
    data: envData,
    loading: envLoading,
    error: envError,
    refetch: envRefetch,
  } = useAdminApi<EnvStatusData>("/api/dev/env-status");

  if (envLoading) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          환경변수 상태
        </h3>
        <AdminLoadingSkeleton variant="table" />
      </AdminSurface>
    );
  }

  if (envError) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          환경변수 상태
        </h3>
        <AdminErrorState message={envError} onRetry={envRefetch} />
      </AdminSurface>
    );
  }

  if (!envData) return null;

  const hasMissing = envData.summary.missing > 0;
  const configuredVars = envData.variables.filter((v) => v.configured);
  const missingVars = envData.variables.filter((v) => !v.configured);

  return (
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        환경변수 상태
      </h3>

      {/* 요약 카운트 + 아코디언 토글 */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={`환경변수 상세 목록 ${expanded ? "접기" : "펼치기"}`}
                className="mb-3 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-[var(--background)]/80"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            hasMissing ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
          }`}
        >
          {hasMissing ? (
            <AlertTriangle className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          )}
        </span>
        <span className="flex-1 text-left text-[var(--foreground)]">
          <strong>{envData.summary.configured}/{envData.summary.total}</strong> 설정됨
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* 아코디언 상세 목록 — 서비스 그룹별 */}
      {expanded && (
        <div className="mb-3 space-y-3">
          {Object.entries(ENV_GROUP_LABELS).map(([group, label]) => {
            const groupVars = envData.variables.filter((v) => v.group === group);
            if (groupVars.length === 0) return null;
            const groupConfigured = groupVars.filter((v) => v.configured).length;
            const allConfigured = groupConfigured === groupVars.length;

            return (
              <div key={group}>
                <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${
                  allConfigured ? "text-green-700" : "text-[var(--foreground)]"
                }`}>
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    allConfigured ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    {allConfigured ? "✓" : groupVars.length - groupConfigured}
                  </span>
                  {label}
                  <span className="font-normal text-[var(--muted)]">
                    ({groupConfigured}/{groupVars.length})
                  </span>
                </p>
                <ul className="space-y-1">
                  {groupVars.map((v) => (
                    <li key={v.key} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                      v.configured ? "bg-green-50" : v.required ? "bg-red-50" : "bg-amber-50"
                    }`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        v.configured
                          ? "bg-green-100 text-green-600"
                          : v.required
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-600"
                      }`}>
                        {v.configured ? (
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <X className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-[var(--foreground)]">{v.label}</span>
                        <span className="ml-1.5 text-[var(--muted)]">({v.key})</span>
                      </span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        v.configured
                          ? v.scope === "public" ? "bg-blue-100 text-blue-700" : "bg-[var(--background)] text-[var(--muted)]"
                          : v.required ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {v.configured ? v.scope : v.required ? "필수" : "선택"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* 미설정 경고 (아코디언 닫혀있을 때만 표시) */}
      {!expanded && missingVars.filter((v) => v.required).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-semibold text-red-700">
            필수 환경변수 미설정 ({missingVars.filter((v) => v.required).length}건)
          </p>
          <p className="mt-1 text-xs text-red-600">
            {missingVars.filter((v) => v.required).map((v) => v.key).join(", ")}
          </p>
        </div>
      )}
    </AdminSurface>
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
      <AdminSurface tone="white" className="rounded-2xl p-6">
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
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-[var(--background)]/80"
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
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
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
      </AdminSurface>

      {/* 환경변수 건강 상태 */}
      <EnvHealthSection />

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
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        SNS 링크 상태
      </h3>
      <ul className="space-y-2">
        {config.map((item) => (
          <ConfigRow key={item.label} item={item} />
        ))}
      </ul>
    </AdminSurface>
  );
}
