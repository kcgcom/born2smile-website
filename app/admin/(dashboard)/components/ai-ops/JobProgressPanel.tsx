"use client";

import { useMemo } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";
import type { AiOpsSuggestionJob, AiOpsSuggestionJobEvent } from "@/lib/admin-ai-ops-types";
import {
  JOB_STAGE_SEQUENCE,
  buildJobProgressSteps,
  defaultStageMessage,
  stageLabel,
  stepBadgeTone,
  stepConnectorTone,
  stepStateLabel,
  stepTone,
  targetTypeLabel,
} from "./suggestions-shared";

export function JobProgressPanel({
  job,
  events,
  loading,
  error,
}: {
  job: AiOpsSuggestionJob | null;
  events: AiOpsSuggestionJobEvent[];
  loading: boolean;
  error: string | null;
}) {
  const progressSteps = useMemo(() => buildJobProgressSteps(job, events), [events, job]);
  const completedSteps = progressSteps.filter((step) => step.state === "done").length;
  const activeStep = progressSteps.find((step) => step.state === "current") ?? null;
  const recentEvents = events.slice(-5).reverse();
  const latestEvent = recentEvents[0] ?? null;

  if (!job && !loading && !error) return null;

  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
            생성 진행 상태
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {error
              ? `잡 상태 조회 오류: ${error}`
              : loading && !job
                ? "잡 상태를 불러오고 있습니다."
                : job?.message}
          </p>
        </div>
        {job && (
          <div className="min-w-[140px] rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <div className="text-xs font-medium text-slate-500">현재 단계</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{stageLabel(job.stage)}</div>
          </div>
        )}
      </div>

      {job && (
        <>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">작업 대상</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {targetTypeLabel(job.targetType)} · {job.targetId}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500">단계 진행</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {job.status === "completed" ? JOB_STAGE_SEQUENCE.length : completedSteps}/{JOB_STAGE_SEQUENCE.length}
                </div>
              </div>
            </div>
            {activeStep && job.status === "running" && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                진행 중: {activeStep.label}
              </div>
            )}
            {latestEvent && (
              <div className="mt-3 text-xs text-slate-500">
                최근 업데이트: {latestEvent.message}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center px-1">
                {progressSteps.map((step, index) => (
                  <div key={step.stage} className="flex items-center">
                    {index > 0 && (
                      <div
                        aria-hidden="true"
                        className={`mx-2 h-px w-8 shrink-0 sm:w-10 ${stepConnectorTone(progressSteps[index - 1]?.state ?? "pending")}`}
                      />
                    )}
                    <div className="flex min-w-[72px] flex-col items-center gap-1 text-center">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${stepTone(step.state)}`}>
                        {step.state === "current" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="text-[11px] font-semibold leading-tight text-slate-900">
                        {step.label}
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stepBadgeTone(step.state)}`}>
                        {stepStateLabel(step.state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-medium text-slate-500">현재 단계 안내</div>
              <div className="mt-1 text-sm text-slate-700">
                {(activeStep?.message ?? latestEvent?.message ?? (job ? defaultStageMessage(job.stage) : "")) || "진행 상태를 확인하고 있습니다."}
              </div>
            </div>
          </div>
        </>
      )}

      {job?.lastError && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {job.lastError}
        </div>
      )}
    </AdminSurface>
  );
}
