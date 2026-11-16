"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminActionButton, AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { ContentPlannerItem, PlannerStatus } from "@/lib/content-planner";
import { taskResultSchema, type TaskWorkflow } from "@/lib/content-tasks";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { RevisionList } from "../blog/RevisionList";
import { internalTarget, workResult, workStage, WORK_STAGES, type WorkStage } from "./work-inbox";

const TYPE_LABELS = { blog: "블로그", page: "진료 페이지", faq: "FAQ" };
const STATUS_LABELS: Record<PlannerStatus, string> = { approved: "승인됨", in_progress: "진행 중", review: "검토 대기", scheduled: "예약·반영 예정", published: "완료", deferred: "보류", dismissed: "제외" };

export function ContentWorkInbox() {
  const params = useSearchParams();
  const stageParam = params.get("stage");
  const typeParam = params.get("type");
  const type = typeParam === "blog" || typeParam === "page" || typeParam === "faq" ? typeParam : "all";
  const query = params.get("q") ?? "";
  const opportunity = params.get("opportunity");
  const tasks = useAdminApi<ContentPlannerItem[]>("/api/admin/content-planner");
  const { mutate, error } = useAdminMutation<ContentPlannerItem>();
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = useMemo(() => Array.isArray(tasks.data) ? tasks.data : [], [tasks.data]);
  const requestedItem = opportunity ? items.find(item => item.opportunityKey === opportunity) : null;
  const stage: WorkStage = stageParam === "working" || stageParam === "review" || stageParam === "done" || stageParam === "archive" || stageParam === "proposals" ? stageParam : requestedItem ? workStage(requestedItem) : "proposals";
  const filtered = items.filter(item => workStage(item) === stage && (type === "all" || item.itemType === type) && `${item.title} ${item.targetPage}`.toLowerCase().includes(query.toLowerCase()));
  const updateQuery = (values: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value && (key === "q" || value !== "all")) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  };
  const update = async (item: ContentPlannerItem, status: PlannerStatus) => {
    if (saving) return;
    if (status === "published" && !window.confirm("콘텐츠 반영·발행 결과를 확인했습니까? 이 동작은 작업 상태만 완료로 바꿉니다.")) return;
    setSaving(item.id);
    setNotice(null);
    try {
      const result = await mutate(`/api/admin/content-planner/${encodeURIComponent(item.id)}`, "PUT", { status, baseUpdatedAt: item.updatedAt });
      if (!result.error) {
        const reevaluation = result.data?.sourceSnapshot.reevaluation as { status?: string } | undefined;
        setNotice(reevaluation?.status === "awaiting-content-change" ? "완료 처리했지만 콘텐츠 변경이 확인되지 않았습니다. 반영 결과를 확인해 주세요." : `작업을 ${STATUS_LABELS[status]} 상태로 변경했습니다.`);
      }
      tasks.refetch();
    } finally { setSaving(null); }
  };

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">콘텐츠 작업함</h1><p className="mt-1 text-sm text-slate-600">제안을 승인하고 작업 결과를 검토합니다.</p></div>
      <AdminActionButton tone="dark" onClick={tasks.refetch}>새로고침</AdminActionButton>
    </header>
    {notice && <AdminNotice tone="info">{notice}</AdminNotice>}
    {error && <AdminNotice tone="error">작업 상태 변경 실패: {error}</AdminNotice>}
    {tasks.loading ? <AdminLoadingSkeleton variant="table" /> : tasks.error ? <AdminErrorState message={tasks.error} onRetry={tasks.refetch} /> : !Array.isArray(tasks.data) ? <AdminErrorState message="작업 목록의 형식을 확인할 수 없습니다." onRetry={tasks.refetch} /> : <>
      <div role="group" aria-label="콘텐츠 작업 상태" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WORK_STAGES.map(entry => <button key={entry.id} type="button" aria-pressed={stage === entry.id} onClick={() => updateQuery({ stage: entry.id })} className={`min-h-11 rounded-xl border px-3 py-3 text-sm ${stage === entry.id ? "border-blue-700 bg-blue-50 font-semibold text-blue-800" : "border-slate-200 bg-white text-slate-700"}`}>{entry.label} <span className="ml-1 font-bold">{items.filter(item => workStage(item) === entry.id).length}</span></button>)}
      </div>
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <input type="search" aria-label="작업 검색" placeholder="제목·대상 검색" value={query} onChange={event => updateQuery({ q: event.target.value })} className="col-span-2 min-h-11 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 text-base sm:flex-1 sm:text-sm" />
        <select aria-label="작업 유형" value={type} onChange={event => updateQuery({ type: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="all">전체 유형</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button type="button" aria-pressed={stage === "archive"} onClick={() => updateQuery({ stage: stage === "archive" ? "proposals" : "archive" })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">제외한 작업 {items.filter(item => item.status === "dismissed").length}</button>
      </div>
      {stage === "proposals" && <p className="text-xs text-slate-500">기존 플래너의 보류 작업도 함께 표시합니다. 승인 전 내용을 다시 확인하세요.</p>}
      {opportunity && !items.some(item => item.opportunityKey === opportunity) && <AdminNotice tone="info">해당 제안이 작업함에 없습니다. 기존에 저장된 작업은 아래 상태별 목록에서 확인할 수 있습니다.</AdminNotice>}
      {filtered.length ? <ul aria-label="콘텐츠 작업 목록" className="space-y-3">{filtered.map(item => <li key={item.id}><WorkItem item={item} highlighted={item.opportunityKey === opportunity} busy={Boolean(saving)} onUpdate={status => update(item, status)} /></li>)}</ul> : <AdminSurface tone="white" className="rounded-2xl p-6 text-sm text-slate-600">{query || type !== "all" ? "검색 조건에 맞는 작업이 없습니다." : "이 상태의 작업이 없습니다."}</AdminSurface>}
    </>}
  </div>;
}

function WorkItem({ item, highlighted, busy, onUpdate }: { item: ContentPlannerItem; highlighted: boolean; busy: boolean; onUpdate: (status: PlannerStatus) => void }) {
  const result = workResult(item);
  const target = internalTarget(item.targetPage);
  const workflow = item.sourceSnapshot.taskWorkflow as TaskWorkflow | undefined;
  const parsedResult = taskResultSchema.safeParse(workflow?.result);
  const submitted = parsedResult.success ? parsedResult.data : null;
  return <AdminSurface tone="white" className={`rounded-2xl p-4 sm:p-5 ${highlighted ? "ring-2 ring-blue-700" : ""}`}>
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600"><span>{TYPE_LABELS[item.itemType]}</span><span className="rounded-full bg-slate-100 px-2 py-1">{workflow?.proposalPending && item.status === "deferred" ? "승인 대기" : STATUS_LABELS[item.status]}</span>{item.dueDate && <span>기한 {item.dueDate}</span>}</div>
    <h2 className="mt-2 break-words text-lg font-bold lg:text-base">{item.title}</h2>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{item.rationale || "저장된 보강 이유가 없습니다. 제안 상세를 확인하세요."}</p>
    <p className="mt-2 break-all text-xs text-slate-500">대상: {item.targetPage}</p>
    {workflow?.workerId && <p className="mt-2 text-xs text-slate-600">담당: {workflow.workerId}</p>}
    {workflow?.blockedReason ? <div className="mt-3"><AdminNotice tone="warning">진행 보류: {workflow.blockedReason}</AdminNotice></div> : workflow?.message && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{workflow.message}</p>}
    <div className="mt-3 flex flex-wrap gap-2 lg:mt-2">
      {item.status === "deferred" && <AdminActionButton tone="primary" disabled={busy} onClick={() => onUpdate("approved")}>승인</AdminActionButton>}
      {item.status === "approved" && <AdminActionButton tone="primary" disabled={busy} onClick={() => onUpdate("in_progress")}>작업 시작</AdminActionButton>}
      {item.status === "in_progress" && <AdminActionButton tone="primary" disabled={busy} onClick={() => onUpdate("review")}>검토 요청</AdminActionButton>}
      {item.status === "review" && <><AdminActionButton tone="primary" disabled={busy} onClick={() => onUpdate("published")}>결과 확인·완료 처리</AdminActionButton><AdminActionButton tone="dark" disabled={busy} onClick={() => onUpdate("in_progress")}>작업으로 돌리기</AdminActionButton></>}
      {item.status !== "published" && item.status !== "deferred" && item.status !== "dismissed" && <AdminActionButton tone="dark" disabled={busy} onClick={() => onUpdate("deferred")}>보류</AdminActionButton>}
      {item.status === "deferred" && <AdminActionButton tone="dark" disabled={busy} onClick={() => onUpdate("dismissed")}>제외</AdminActionButton>}
      {item.status === "dismissed" && <AdminActionButton tone="dark" disabled={busy} onClick={() => onUpdate("deferred")}>제안 대기로 복원</AdminActionButton>}
      {result.revisionId && <AdminActionLink tone="primary" href={`/admin/content/revisions/${result.revisionId}`}>연결된 수정안 검토</AdminActionLink>}
      {submitted?.kind === "code" && <AdminActionLink tone="primary" href={submitted.pullRequestUrl} target="_blank" rel="noopener noreferrer">코드 변경안 검토 (새 창)</AdminActionLink>}
      {result.postSlug ? <AdminActionLink tone="dark" href={`/admin/content/posts/${encodeURIComponent(result.postSlug)}`}>포스트 검토</AdminActionLink> : item.itemType === "blog" && <AdminActionLink tone="dark" href={`/admin/content/posts?q=${encodeURIComponent(item.title)}`}>관련 포스트 찾기</AdminActionLink>}
      {target && <AdminActionLink tone="dark" href={target} target="_blank" rel="noopener noreferrer">대상 페이지 (새 창)</AdminActionLink>}
    </div>
    {submitted?.kind === "code" && <p className="mt-3 break-words text-xs text-slate-500">변경 파일: {submitted.files.join(", ")}</p>}
    {item.status === "scheduled" && <p className="mt-3 text-sm text-slate-600">발행·반영 예정 작업입니다. 실제 공개 상태와 예약일을 확인하세요. <a href="/admin/content/schedule" className="underline">발행 일정</a></p>}
    {(item.itemType === "page" || item.itemType === "faq") && item.status === "review" && <p className="mt-3 text-sm text-slate-600">페이지·FAQ 변경은 코드 변경안과 미리보기를 검토한 뒤 반영하세요.</p>}
    <div className="mt-3 grid gap-3 lg:mt-2 lg:grid-cols-2 lg:gap-4">
    <details className="min-w-0 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">제안 상세·근거</summary><StoredBrief brief={item.brief} /><details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-xs text-slate-500">저장된 기획·분석 자료 원문</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify({ brief: item.brief, evidence: item.sourceSnapshot }, null, 2)}</pre></details></details>
    {result.postSlug && <RevisionList slug={result.postSlug} compact />}
    </div>
  </AdminSurface>;
}

function StoredBrief({ brief }: { brief: Record<string, unknown> }) {
  const fields = { targetKeyword: "핵심 질문·키워드", targetReader: "대상 독자", question: "보강할 질문", answer: "답변", heroCopy: "주요 안내", supportingCopy: "보조 안내", outline: "작성 범위", blocks: "보강 영역", faqQuestions: "추가할 FAQ", checklist: "완료 기준", sourceFiles: "변경 대상 파일", cta: "후속 안내" };
  const entries = Object.entries(fields).flatMap(([key, label]) => {
    const value = brief[key];
    const text = typeof value === "string" ? value : Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").join("\n") : "";
    return text ? [{ key, label, text }] : [];
  });
  return entries.length ? <dl className="grid gap-3 sm:grid-cols-2">{entries.map(entry => <div key={entry.key} className="rounded-xl bg-slate-50 p-3"><dt className="font-semibold">{entry.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{entry.text}</dd></div>)}</dl> : <p className="text-sm text-slate-500">구조화된 작업 범위가 없습니다. 저장된 원문을 확인하세요.</p>;
}
