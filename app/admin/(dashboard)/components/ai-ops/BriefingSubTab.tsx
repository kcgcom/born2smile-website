"use client";

import { useState } from "react";
import { AlertCircle, Sparkles, Wand2 } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi } from "../useAdminApi";
import type { AiOpsBriefing } from "@/lib/admin-ai-ops-types";
import { AiOpsSummaryCard } from "./AiOpsSummaryCard";
import { PriorityScoreBadge } from "./PriorityScoreBadge";

export function BriefingSubTab() {
  const [period, setPeriod] = useState<"7d" | "28d">("7d");
  const { data, loading, error, refetch } = useAdminApi<AiOpsBriefing>(`/api/admin/ai-ops/briefing?period=${period}`);

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <AdminSurface tone="success" className="rounded-3xl px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <AdminPill tone="sky">AI 운영 브리핑</AdminPill>
            <h2 className="mt-3 text-2xl font-bold">{data.headline}</h2>
            <p className="mt-2 text-sm text-emerald-50/90">{data.summary}</p>
          </div>
          <div className="flex gap-2">
            {(["7d", "28d"] as const).map((value) => {
              const active = value === period;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-white text-emerald-800"
                      : "border border-white/20 bg-white/10 text-emerald-50"
                  }`}
                >
                  최근 {value === "7d" ? "7일" : "28일"}
                </button>
              );
            })}
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AiOpsSummaryCard label="세션" value={formatMetric(data.metrics.sessions)} helper={formatChange(data.metrics.sessionsChange)} />
        <AiOpsSummaryCard label="검색 클릭" value={formatMetric(data.metrics.clicks)} helper={formatChange(data.metrics.clicksChange)} />
        <AiOpsSummaryCard label="검색 노출" value={formatMetric(data.metrics.impressions)} helper={formatChange(data.metrics.impressionsChange)} />
        <AiOpsSummaryCard label="블로그 후보" value={`${data.metrics.postsNeedingAttention}건`} helper="개선 우선 포스트" />
        <AiOpsSummaryCard label="핵심 페이지 후보" value={`${data.metrics.pagesNeedingAttention}건`} helper="진단 우선 페이지" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">지금 할 일</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.recommendedActions.map((action) => (
              <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{action.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{action.description}</div>
                  </div>
                  <PriorityScoreBadge score={action.priorityScore} />
                </div>
              </div>
            ))}
          </div>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">상위 개선 후보</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.topCandidates.map((candidate) => (
              <div key={candidate.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{candidate.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{candidate.primaryIssue}</div>
                  </div>
                  <PriorityScoreBadge score={candidate.priorityScore} />
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {candidate.issues.slice(0, 2).map((issue) => (
                    <li key={issue.code} className="flex gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{issue.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}

function formatMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ko-KR");
}

function formatChange(value: number | null) {
  if (value === null) return "이전 기간 비교 불가";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs 이전`;
}
