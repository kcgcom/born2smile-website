"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, ClipboardCheck, ExternalLink, ListPlus, LockKeyhole, Send } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { ActionValueAudit, ActionWorkflowItem } from "@/lib/content-coverage/action-workflow-store";
import type { TopicExpansionFlag, TopicExpansionReport } from "@/lib/content-coverage/topic-expansion";
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
    source: "reviewed-baseline" | "baseline-with-admin-overrides" | "baseline-with-reevaluation" | "baseline-with-admin-overrides-and-reevaluation" | "static-evaluation";
    baselineReviewedAt: string;
    adminOverrideCount: number;
    latestAdminReviewAt: string | null;
    completedReevaluationCount: number;
    latestReevaluationAt: string | null;
    topicReevaluationVersions: Record<string, string>;
  };
  recommendations: ActionWorkflowItem[];
  valueAudit: ActionValueAudit;
  topicExpansion: TopicExpansionReport;
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
      reviews: items.filter((item) => item.canCompleteReview).sort(compareActionPriority),
      ready: items.filter((item) => item.canPromote).sort(compareActionPriority),
      blocked: items.filter((item) => !item.canCompleteReview && !item.plannerItem && item.unresolvedBlockerKeys.length > 0).sort(compareActionPriority),
      promoted: items.filter((item) => item.plannerItem != null).sort(compareActionPriority),
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
              <AdminActionLink tone="dark" href="/admin/content/strategy/reevaluation-review">재평가 검토</AdminActionLink>
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
          {query.data.assessmentInput.completedReevaluationCount > 0 ? ` · 완료 재평가 ${query.data.assessmentInput.completedReevaluationCount}건` : ""}
        </p>
      </AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {message && <AdminNotice tone="success">{message}</AdminNotice>}

      <ValueAuditPanel audit={query.data.valueAudit} />
      <TopicExpansionPanel report={query.data.topicExpansion} />

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

function TopicExpansionPanel({ report }: { report: TopicExpansionReport }) {
  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><ListPlus className="h-5 w-5" />다음 검증 주제</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">검색 수요·환자 가치·전략 적합도로 명세와 라벨링을 시작할 후보를 고릅니다. 이 순위는 콘텐츠 공백 판정이 아니며 자동으로 운영 엔진에 추가되지 않습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs"><AdminPill tone="white">후보 {report.eligibleCount}개</AdminPill><AdminPill tone="white">{report.modelVersion}</AdminPill></div>
      </div>

      {report.dataStatus !== "ready" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">검색량 입력이 준비되지 않아 확장 후보 순위를 확정할 수 없습니다.</div>}
      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {report.recommended.map((candidate, index) => <div key={candidate.topicKey} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-sky-700">{index + 1}순위</span><span className="text-xs text-slate-400">{candidate.categoryLabel}</span></div><h3 className="mt-2 font-bold text-slate-950">{candidate.subGroup}</h3><p className="mt-1 text-xs text-slate-400">{candidate.topicKey}</p><div className="mt-3 flex flex-wrap gap-1"><AdminPill tone="white">온보딩 {candidate.onboardingScore ?? "보류"}점</AdminPill><AdminPill tone="white">수요 {candidate.demandScore ?? "-"}</AdminPill></div><p className="mt-3 text-xs leading-5 text-slate-600">월 {candidate.monthlyVolume?.toLocaleString("ko-KR") ?? "-"}회 · 환자 가치 {candidate.patientBusinessValue} · 전략 {candidate.strategicFit}</p></div>)}
      </div>

      {report.manualReview.length > 0 && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><strong className="text-sm text-slate-900">자동 추천 제외</strong><p className="mt-1 text-xs leading-5 text-slate-500">제품·브랜드·지역 탐색, 진료 범위, 기존 개념과의 중복을 먼저 확인해야 하는 주제입니다.</p><div className="mt-3 flex flex-wrap gap-2">{report.manualReview.map((candidate) => <span key={candidate.topicKey} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">{candidate.categoryLabel} · {candidate.subGroup} · {candidate.flags.map(expansionFlagLabel).join("/")}</span>)}</div></div>}
    </AdminSurface>
  );
}

function expansionFlagLabel(flag: TopicExpansionFlag) {
  return ({ "product-led": "제품 중심", "brand-led": "브랜드 탐색", "local-navigation": "지역 탐색", "service-scope-review": "진료 범위 확인", "cross-topic-overlap": "기존 개념 중복" } as const)[flag];
}

function ValueAuditPanel({ audit }: { audit: ActionValueAudit }) {
  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Activity className="h-5 w-5" />실행 가치 진단</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">검색 수요와 검토된 개념 부족도가 현재 실행 순위에 미치는 영향을 확인합니다. 민감도 순위는 두 가중치를 ±10%p 바꾼 결과입니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <AdminPill tone="white">{dataStatusLabel(audit.dataStatus)}</AdminPill>
          <AdminPill tone="white">검색량 범위 {Math.round(audit.volumeCoverage * 100)}%</AdminPill>
          <AdminPill tone="white">택소노미 v{audit.taxonomyVersion ?? "-"}</AdminPill>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <AuditMetric label="평가 완료" value={`${audit.stats.scored}/${audit.stats.total}`} />
        <AuditMetric label="평균" value={scoreText(audit.stats.average)} />
        <AuditMetric label="중앙값" value={scoreText(audit.stats.median)} />
        <AuditMetric label="점수 범위" value={audit.stats.minimum == null ? "-" : `${audit.stats.minimum}–${audit.stats.maximum}`} />
        <AuditMetric label="Now / Next / Watch" value={`${audit.stats.now} / ${audit.stats.next} / ${audit.stats.watch}`} />
        <AuditMetric label="순위 민감" value={`${audit.stats.rankSensitive}건`} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        모델 {audit.modelVersion ?? "평가 없음"} · SearchAd {audit.sourceUpdatedAt ? formatDate(audit.sourceUpdatedAt) : "스냅샷 없음"}
      </p>

      {audit.warnings.length > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">{audit.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div>}

      {audit.items.length === 0 ? <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">진단할 콘텐츠 작업이 없습니다.</div> : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">순위</th><th className="px-3 py-3">작업</th><th className="px-3 py-3 text-right">가치</th><th className="px-3 py-3 text-right">수요</th><th className="px-3 py-3 text-right">개념 부족</th><th className="px-3 py-3 text-right">환자 가치</th><th className="px-3 py-3 text-right">전략</th><th className="px-3 py-3">우선순위</th><th className="px-3 py-3">민감도 순위</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{audit.items.map((item) => <tr key={item.actionKey} className="align-top"><td className="px-3 py-3 font-bold text-slate-900">{item.baseRank ?? "-"}</td><td className="max-w-72 px-3 py-3"><strong className="block text-slate-900">{item.title}</strong><span className="mt-1 block text-slate-400">{ACTION_LABELS[item.actionType]} · 월 {item.monthlyVolume?.toLocaleString("ko-KR") ?? "-"}회</span></td><td className="px-3 py-3 text-right font-bold text-sky-700">{scoreText(item.score)}</td><td className="px-3 py-3 text-right">{scoreText(item.demandScore)}</td><td className="px-3 py-3 text-right">{scoreText(item.conceptNeedScore)}</td><td className="px-3 py-3 text-right">{scoreText(item.patientBusinessValue)}</td><td className="px-3 py-3 text-right">{scoreText(item.strategicFit)}</td><td className="px-3 py-3 font-semibold">{priorityLabel(item.priority)}</td><td className={`px-3 py-3 ${item.maxRankShift > 0 ? "font-semibold text-amber-700" : "text-slate-500"}`}>{sensitivityRankLabel(item)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </AdminSurface>
  );
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center"><strong className="block text-base text-slate-950">{value}</strong><span className="mt-1 block text-[11px] text-slate-500">{label}</span></div>;
}

function scoreText(value: number | null) {
  return value == null ? "보류" : `${value}점`;
}

function dataStatusLabel(status: ActionValueAudit["dataStatus"]) {
  return ({ ready: "검색량 준비됨", "snapshot-unavailable": "스냅샷 없음", "taxonomy-mismatch": "택소노미 불일치", "insufficient-coverage": "검색량 범위 부족", "no-actions": "평가 작업 없음" } as const)[status];
}

function priorityLabel(priority: ActionValueAudit["items"][number]["priority"]) {
  return ({ now: "Now", next: "Next", watch: "Watch" } as const)[priority];
}

function sensitivityRankLabel(item: ActionValueAudit["items"][number]) {
  if (item.baseRank == null) return "평가 보류";
  if (item.maxRankShift === 0) return "순위 안정";
  return `수요 ${item.demandEmphasisRank ?? "-"}위 · 부족 ${item.conceptNeedEmphasisRank ?? "-"}위`;
}

function Section({ icon, title, description, count, children }: { icon: React.ReactNode; title: string; description: string; count: number; children: React.ReactNode }) {
  return <section><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold">{icon}{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><AdminPill tone="white">{count}건</AdminPill></div><div className="grid gap-4 xl:grid-cols-2">{children}</div></section>;
}

function ContentActionCard({ item, loading, onPromote }: { item: ActionWorkflowItem; loading: boolean; onPromote: () => void }) {
  return <AdminSurface tone="white" className="rounded-2xl p-5"><ActionHeader item={item} /><p className="mt-3 text-sm leading-6 text-slate-600">{item.why}</p><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">대상</strong> {item.targetPath}<br /><strong className="text-slate-900">미충족 개념</strong> {item.missingConcepts.length ? item.missingConcepts.join(", ") : "없음"}{item.partialConcepts.length > 0 && <><br /><strong className="text-slate-900">부분 충족</strong> {item.partialConcepts.join(", ")}</>}</div>{item.valueAssessment && <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-950"><strong>실행 가치 {item.valueScore == null ? "평가 보류" : `${item.valueScore}점`}</strong>{item.valueAssessment.reasons.map((reason) => <span key={reason} className="block">{reason}</span>)}</div>}{item.unresolvedBlockerKeys.length > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />선행 검토 대기: {item.unresolvedBlockerKeys.join(", ")}</div>}{item.reevaluationState && item.reevaluationState.status !== "cancelled" && <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${reevaluationTone(item.reevaluationState.status)}`}><strong>{reevaluationLabel(item.reevaluationState.status)}</strong><span className="mt-1 block">{item.reevaluationState.reason}</span></div>}<div className="mt-4 flex flex-wrap gap-2">{item.canPromote && <AdminActionButton tone="primary" disabled={loading} onClick={onPromote}><Send className="h-4 w-4" />플래너로 전환</AdminActionButton>}{item.reevaluationState?.status === "needs-review" && <AdminActionLink tone="dark" href="/admin/content/strategy/reevaluation-review">새 근거 검토</AdminActionLink>}{item.plannerItem && <AdminActionLink tone="primary" href={`/admin/content/planner?type=${item.plannerItem.itemType}&opportunity=${encodeURIComponent(item.actionKey)}`}>플래너에서 보기 <ExternalLink className="h-4 w-4" /></AdminActionLink>}</div></AdminSurface>;
}

function reevaluationLabel(status: NonNullable<ActionWorkflowItem["reevaluationState"]>["status"]) {
  return ({ "awaiting-content-change": "콘텐츠 변경 확인 필요", "pending-evidence-refresh": "임베딩 워커 대기", processing: "근거 재검색 중", "needs-review": "새 근거 검토 필요", completed: "재평가 반영 완료", failed: "재평가 실패", cancelled: "재평가 취소" } as const)[status];
}

function reevaluationTone(status: NonNullable<ActionWorkflowItem["reevaluationState"]>["status"]) {
  if (status === "awaiting-content-change" || status === "failed") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function ActionHeader({ item }: { item: ActionWorkflowItem }) {
  return <div><div className="flex flex-wrap gap-2"><AdminPill tone="white">{ACTION_LABELS[item.actionType]}</AdminPill><AdminPill tone="white">{urgencyLabel(item.urgency)}</AdminPill>{item.valueAssessment && <AdminPill tone="white">실행 가치 {item.valueScore == null ? "보류" : `${item.valueScore}점`}</AdminPill>}<AdminPill tone="white">신뢰도 {item.confidence}</AdminPill></div><h3 className="mt-3 font-bold text-slate-950">{item.title}</h3></div>;
}

function compareActionPriority(a: ActionWorkflowItem, b: ActionWorkflowItem) {
  const urgencyRank = { critical: 4, high: 3, normal: 2, low: 1 } as const;
  return urgencyRank[b.urgency] - urgencyRank[a.urgency]
    || (b.valueScore ?? -1) - (a.valueScore ?? -1)
    || a.title.localeCompare(b.title, "ko");
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
