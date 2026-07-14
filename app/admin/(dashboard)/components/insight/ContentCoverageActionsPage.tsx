"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, ExternalLink, LockKeyhole, Send } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { ActionWorkflowItem } from "@/lib/content-coverage/action-workflow-store";
import type { ContentActionType } from "@/lib/content-coverage/types";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/content-coverage/actions";

type WorkflowResponse = {
  schemaVersion: string;
  retrievalVersion: string;
  assessmentInput: {
    version: string;
    source: "reviewed-baseline" | "baseline-with-admin-overrides" | "static-evaluation";
    baselineReviewedAt: string;
    adminOverrideCount: number;
    latestAdminReviewAt: string | null;
  };
  recommendations: ActionWorkflowItem[];
  stats: { total: number; reviewsPending: number; ready: number; blocked: number; promoted: number; reevaluationPending: number };
};

const ACTION_LABELS: Record<ContentActionType, string> = {
  "create-blog": "블로그 작성",
  "update-blog": "블로그 보강",
  "update-treatment-page": "진료 페이지 보강",
  "add-faq": "FAQ 추가",
  "update-faq": "FAQ 보강",
  "promote-faq-to-page": "FAQ를 페이지로 확장",
  "refresh-content": "콘텐츠 갱신",
  "resolve-conflict": "상충 내용 정리",
  "evidence-review": "근거 검토",
  "clinical-review": "임상 검토",
  "no-action": "현재 작업 없음",
};

export function ContentCoverageActionsPage() {
  const query = useAdminApi<WorkflowResponse>(ENDPOINT);
  const mutation = useAdminMutation();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const groups = useMemo(() => {
    const items = query.data?.recommendations ?? [];
    return {
      reviews: items.filter((item) => item.canCompleteReview),
      ready: items.filter((item) => item.canPromote),
      blocked: items.filter((item) => !item.canCompleteReview && !item.plannerItem && item.unresolvedBlockerKeys.length > 0),
      promoted: items.filter((item) => item.plannerItem != null),
      noAction: items.filter((item) => item.actionType === "no-action"),
    };
  }, [query.data]);

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="콘텐츠 행동추천을 불러올 수 없습니다." />;
  const assessmentInputVersion = query.data.assessmentInput.version;

  const saveReview = async (item: ActionWorkflowItem, status: "pending" | "completed") => {
    setMessage(null);
    const result = await mutation.mutate(ENDPOINT, "PATCH", {
      actionKey: item.actionKey,
      assessmentInputVersion,
      status,
      notes: notes[item.actionKey] ?? item.reviewState?.notes ?? "",
    });
    if (!result.error) {
      setMessage(status === "completed" ? "검토 판단을 기록했습니다. 연결된 콘텐츠 작업을 다시 평가했습니다." : "검토를 다시 열었습니다.");
      query.refetch();
    }
  };

  const promote = async (item: ActionWorkflowItem) => {
    setMessage(null);
    const result = await mutation.mutate(ENDPOINT, "POST", {
      actionKey: item.actionKey,
      assessmentInputVersion,
    });
    if (!result.error) {
      setMessage("행동추천을 콘텐츠 플래너에 등록했습니다.");
      query.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="white">콘텐츠 행동추천</AdminPill>
            <h1 className="mt-3 text-xl font-bold">근거 판정을 검토하고 실행 가능한 작업만 플래너로 넘깁니다.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              임상·근거 검토가 필요한 추천은 먼저 판단 근거를 기록합니다. 필수 선행 검토가 남은 콘텐츠 작업은 전환할 수 없습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="dark" href="/admin/content/strategy/concept-review"><ArrowLeft className="h-4 w-4" />개념별 근거 검토</AdminActionLink>
              <AdminActionLink tone="dark" href="/admin/content/strategy">기회 분석으로</AdminActionLink>
              <AdminActionLink tone="primary" href="/admin/content/planner">콘텐츠 플래너</AdminActionLink>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Metric label="검토 대기" value={query.data.stats.reviewsPending} />
            <Metric label="전환 가능" value={query.data.stats.ready} />
            <Metric label="차단" value={query.data.stats.blocked} />
            <Metric label="플래너 등록" value={query.data.stats.promoted} />
            <Metric label="재평가 대기" value={query.data.stats.reevaluationPending} />
          </div>
        </div>
        <p className="mt-5 text-xs text-slate-400">
          판정 {query.data.schemaVersion} · 근거 검색 {query.data.retrievalVersion} · 운영 라벨 {query.data.assessmentInput.version}
          {query.data.assessmentInput.adminOverrideCount > 0 ? ` · 관리자 수정 ${query.data.assessmentInput.adminOverrideCount}건` : " · 검토 기준선 사용"}
        </p>
      </AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {message && <AdminNotice tone="success">{message}</AdminNotice>}

      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="선행 검토" description="완료 메모는 후속 콘텐츠 작업을 허용하는 감사 기록입니다." count={groups.reviews.length}>
        {groups.reviews.map((item) => (
          <AdminSurface key={item.actionKey} tone="white" className="rounded-2xl p-5">
            <ActionHeader item={item} />
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.why}</p>
            {item.reviewState?.status === "completed" ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />검토 완료</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-950">{item.reviewState.notes}</p>
                <p className="mt-2 text-xs text-emerald-700">{item.reviewState.updatedBy} · {formatDate(item.reviewState.updatedAt)}</p>
                <AdminActionButton tone="dark" className="mt-3" disabled={mutation.loading} onClick={() => saveReview(item, "pending")}>다시 열기</AdminActionButton>
              </div>
            ) : (
              <div className="mt-4">
                <label className="text-sm font-bold">검토 판단 근거
                  <textarea
                    value={notes[item.actionKey] ?? item.reviewState?.notes ?? ""}
                    maxLength={1000}
                    rows={3}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.actionKey]: event.target.value }))}
                    placeholder="확인한 내용과 콘텐츠 반영 시 주의할 점을 기록하세요."
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]"
                  />
                </label>
                <AdminActionButton tone="primary" className="mt-3" disabled={mutation.loading || (notes[item.actionKey] ?? item.reviewState?.notes ?? "").trim().length < 2} onClick={() => saveReview(item, "completed")}>검토 완료 기록</AdminActionButton>
              </div>
            )}
          </AdminSurface>
        ))}
      </Section>

      <Section icon={<Send className="h-5 w-5" />} title="전환 가능한 작업" description="필수 선행 조건을 통과해 콘텐츠 플래너에 등록할 수 있습니다." count={groups.ready.length}>
        {groups.ready.length === 0 ? <EmptyState text="현재 전환 가능한 작업이 없습니다." /> : groups.ready.map((item) => <ContentActionCard key={item.actionKey} item={item} loading={mutation.loading} onPromote={() => promote(item)} />)}
      </Section>

      {groups.blocked.length > 0 && <Section icon={<LockKeyhole className="h-5 w-5" />} title="선행 검토 대기" description="표시된 검토를 완료하면 자동으로 전환 가능 여부가 다시 계산됩니다." count={groups.blocked.length}>
        {groups.blocked.map((item) => <ContentActionCard key={item.actionKey} item={item} loading={mutation.loading} onPromote={() => promote(item)} />)}
      </Section>}

      {groups.promoted.length > 0 && <Section icon={<CheckCircle2 className="h-5 w-5" />} title="플래너 등록 완료" description="실행 상태와 일정은 콘텐츠 플래너에서 관리합니다." count={groups.promoted.length}>
        {groups.promoted.map((item) => <ContentActionCard key={item.actionKey} item={item} loading={mutation.loading} onPromote={() => promote(item)} />)}
      </Section>}

      {groups.noAction.map((item) => <AdminNotice key={item.actionKey} tone="info"><strong>{item.title}</strong> — {item.why}</AdminNotice>)}
    </div>
  );
}

function Section({ icon, title, description, count, children }: { icon: React.ReactNode; title: string; description: string; count: number; children: React.ReactNode }) {
  return <section><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold">{icon}{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><AdminPill tone="white">{count}건</AdminPill></div><div className="grid gap-4 xl:grid-cols-2">{children}</div></section>;
}

function ContentActionCard({ item, loading, onPromote }: { item: ActionWorkflowItem; loading: boolean; onPromote: () => void }) {
  return <AdminSurface tone="white" className="rounded-2xl p-5"><ActionHeader item={item} /><p className="mt-3 text-sm leading-6 text-slate-600">{item.why}</p><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">대상</strong> {item.targetPath}<br /><strong className="text-slate-900">미충족 개념</strong> {item.missingConcepts.length ? item.missingConcepts.join(", ") : "없음"}{item.partialConcepts.length > 0 && <><br /><strong className="text-slate-900">부분 충족</strong> {item.partialConcepts.join(", ")}</>}</div>{item.unresolvedBlockerKeys.length > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />선행 검토 대기: {item.unresolvedBlockerKeys.join(", ")}</div>}{item.reevaluationState && item.reevaluationState.status !== "cancelled" && <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${item.reevaluationState.status === "awaiting-content-change" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}><strong>{item.reevaluationState.status === "awaiting-content-change" ? "콘텐츠 변경 확인 필요" : "근거 재평가 대기"}</strong><span className="mt-1 block">{item.reevaluationState.reason}</span></div>}<div className="mt-4 flex flex-wrap gap-2">{item.canPromote && <AdminActionButton tone="primary" disabled={loading} onClick={onPromote}><Send className="h-4 w-4" />플래너로 전환</AdminActionButton>}{item.plannerItem && <AdminActionLink tone="primary" href={`/admin/content/planner?type=${item.plannerItem.itemType}&opportunity=${encodeURIComponent(item.actionKey)}`}>플래너에서 보기 <ExternalLink className="h-4 w-4" /></AdminActionLink>}</div></AdminSurface>;
}

function ActionHeader({ item }: { item: ActionWorkflowItem }) {
  return <div><div className="flex flex-wrap gap-2"><AdminPill tone="white">{ACTION_LABELS[item.actionType]}</AdminPill><AdminPill tone="white">{urgencyLabel(item.urgency)}</AdminPill><AdminPill tone="white">신뢰도 {item.confidence}</AdminPill></div><h3 className="mt-3 font-bold text-slate-950">{item.title}</h3></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-24 rounded-2xl bg-slate-50 px-3 py-3 text-center"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <AdminSurface tone="white" className="rounded-2xl p-8 text-center text-sm text-slate-500 xl:col-span-2">{text}</AdminSurface>;
}

function urgencyLabel(value: ActionWorkflowItem["urgency"]) {
  return ({ critical: "긴급", high: "높음", normal: "보통", low: "낮음" } as const)[value];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
