"use client";

import { useState } from "react";
import {
  IMPROVEMENT_ITEMS,
  getImprovementStats,
  type ImprovementStatus,
} from "@/lib/admin-data";
import { DEV_MANIFEST } from "@/lib/dev/generated/dev-manifest";
import { StatCard } from "@/app/admin/(dashboard)/components/StatCard";
import { DataTable } from "@/app/admin/(dashboard)/components/DataTable";

// -------------------------------------------------------------
// 우선순위 배지
// -------------------------------------------------------------

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-800",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority] ?? "bg-gray-100 text-gray-600"}`}
    >
      {priority}
    </span>
  );
}

// -------------------------------------------------------------
// 상태 아이콘
// -------------------------------------------------------------

function StatusIcon({ status }: { status: ImprovementStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "owner-decision") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
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
          <div key={d.name} className="rounded-lg bg-gray-50 p-2.5 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">{d.name}</p>
            <p className="text-xs text-[var(--muted)]">{d.version}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 필터 타입
// -------------------------------------------------------------

type FilterType = "all" | "done" | "pending" | "owner-decision";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "done", label: "완료" },
  { id: "pending", label: "미완료" },
  { id: "owner-decision", label: "오너결정" },
];

// -------------------------------------------------------------
// 프로젝트 현황 탭
// -------------------------------------------------------------

export function ProjectTab() {
  const [filter, setFilter] = useState<FilterType>("all");
  const stats = getImprovementStats();

  const filteredItems =
    filter === "all"
      ? IMPROVEMENT_ITEMS
      : IMPROVEMENT_ITEMS.filter((item) => item.status === filter);

  const percentage = Math.round((stats.done / stats.total) * 100);

  const columns = [
    {
      key: "priority",
      label: "우선순위",
      render: (row: Record<string, unknown>) => (
        <PriorityBadge priority={row.priority as string} />
      ),
    },
    {
      key: "status",
      label: "상태",
      align: "center" as const,
      render: (row: Record<string, unknown>) => (
        <StatusIcon status={row.status as ImprovementStatus} />
      ),
    },
    { key: "title", label: "제목", sortable: true },
    {
      key: "description",
      label: "설명",
      render: (row: Record<string, unknown>) => (
        <span className="text-[var(--muted)]">{row.description as string}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 진행률 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="전체 진행률"
          value={percentage}
          color="text-emerald-600"
          variant="elevated"
        />
        {stats.byPriority.map((bp) => (
          <StatCard
            key={bp.priority}
            label={bp.priority}
            value={bp.done}
            color={
              bp.done === bp.total
                ? "text-green-600"
                : "text-[var(--foreground)]"
            }
          />
        ))}
      </div>

      {/* 전체 통계 요약 */}
      <p className="text-sm text-[var(--muted)]">
        전체 {stats.total}개 중 {stats.done}개 완료, {stats.pending}개 미완료,{" "}
        {stats.ownerDecision}개 오너결정 필요
      </p>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 개선 항목 테이블 */}
      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          개선 항목 ({filteredItems.length}개)
        </h3>
        <DataTable
          columns={columns}
          rows={filteredItems as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage="해당 상태의 항목이 없습니다"
        />
      </div>

      {/* 기술 스택 */}
      <TechStackGrid />
    </div>
  );
}
