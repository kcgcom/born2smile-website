"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Eye, RefreshCw, RotateCcw, X } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import {
  KEYWORD_CATEGORY_LABELS,
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
  type CategoryKeywords,
} from "@/lib/admin-naver-datalab-keywords";
import type { KeywordTaxonomyCandidate } from "@/lib/admin-keyword-taxonomy";
import { TaxonomyViewer } from "./TaxonomyViewer";
import { forceRefetchAdminApi, useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";

const ENDPOINT = "/api/admin/keyword-taxonomy/candidates";

const STATUS_LABELS: Record<KeywordTaxonomyCandidate["status"], string> = {
  pending: "검토 필요",
  approved: "승인됨",
  deferred: "보류",
  rejected: "제외",
};

interface TaxonomyStateSummary {
  active: { version: number | null; keywords: number; subgroups: number };
  pending: { version: number; keywords: number; subgroups: number } | null;
  versions: Array<{ version: number; status: "pending" | "active" | "archived"; changeSummary: string; createdBy: string; createdAt: string }>;
  diff: {
    addedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
    removedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
    addedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
    removedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
  } | null;
  codeDiff: {
    addedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
    removedKeywords: Array<{ category: KeywordCategorySlug; subgroup: string; keyword: string }>;
    addedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
    removedSubgroups: Array<{ category: KeywordCategorySlug; subgroup: string }>;
  };
  codeMatchesActive: boolean;
  codeMatchesPending: boolean;
}

type Decision = "approve" | "defer" | "reject";

export function KeywordCandidateReview({ taxonomy }: { taxonomy: CategoryKeywords[] }) {
  const candidates = useAdminApi<KeywordTaxonomyCandidate[]>(ENDPOINT);
  const taxonomyState = useAdminApi<TaxonomyStateSummary>("/api/admin/keyword-taxonomy/state");
  const { mutate, loading, error } = useAdminMutation<{ ok: boolean }>();
  const { mutate: mutateTaxonomyState, loading: taxonomyStateLoading, error: taxonomyStateError } = useAdminMutation<{ ok: boolean }>();
  const [status, setStatus] = useState<KeywordTaxonomyCandidate["status"]>("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [newCategory, setNewCategory] = useState<KeywordCategorySlug>("implant");
  const [newSubgroupName, setNewSubgroupName] = useState("");
  const [newIntent, setNewIntent] = useState<SearchIntent>("informational");
  const [newTopicTemplate, setNewTopicTemplate] = useState("{keyword} 완벽 가이드: {aspect}");
  const [newTopicAspect, setNewTopicAspect] = useState("");
  const [targetById, setTargetById] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () => (candidates.data ?? []).filter((candidate) => candidate.status === status),
    [candidates.data, status],
  );
  const counts = useMemo(() => {
    const result = { pending: 0, approved: 0, deferred: 0, rejected: 0 };
    for (const candidate of candidates.data ?? []) result[candidate.status]++;
    return result;
  }, [candidates.data]);

  const decisionCounts = useMemo(() => {
    const result = { approve: 0, defer: 0, reject: 0 };
    for (const decision of Object.values(decisions)) result[decision]++;
    return result;
  }, [decisions]);
  const totalDecisions = decisionCounts.approve + decisionCounts.defer + decisionCounts.reject;

  // 특정 버전 택소노미 조회
  const versionTaxonomy = useAdminApi<{
    version: number | null;
    taxonomy: CategoryKeywords[];
    activeTaxonomy: CategoryKeywords[];
  }>(`/api/admin/keyword-taxonomy/state?view=taxonomy&version=${viewingVersion ?? 0}`, viewingVersion !== null);

  // 적용 전 미리보기: 현재 택소노미에 승인 결정을 반영한 가상 택소노미
  const previewTaxonomy = useMemo(() => {
    if (!showPreview || decisionCounts.approve === 0) return null;
    const approvals = Object.entries(decisions).filter(([, d]) => d === "approve");
    if (approvals.length === 0) return null;

    const next = structuredClone(taxonomy);
    for (const [id] of approvals) {
      const candidate = (candidates.data ?? []).find((c) => c.id === id);
      if (!candidate) continue;
      const targetValue = targetById[id] ?? `${candidate.suggestedCategory}::${candidate.suggestedSubgroup}`;
      const [catSlug, sgName] = targetValue.split("::") as [KeywordCategorySlug, string];
      const cat = next.find((c) => c.slug === catSlug);
      const sg = cat?.subGroups.find((g) => g.name === sgName);
      if (sg && !sg.keywords.includes(candidate.keyword)) {
        sg.keywords.push(candidate.keyword);
      }
    }
    return next;
  }, [showPreview, decisions, decisionCounts.approve, taxonomy, candidates.data, targetById]);

  const setDecision = (id: string, decision: Decision) => {
    setDecisions((current) => ({ ...current, [id]: decision }));
  };
  const clearDecision = (id: string) => {
    setDecisions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const applyAllDecisions = async () => {
    const items = Object.entries(decisions).map(([id, decision]) => {
      const targetValue = targetById[id];
      const candidate = (candidates.data ?? []).find((c) => c.id === id);
      const fallback = `${candidate?.suggestedCategory}::${candidate?.suggestedSubgroup}`;
      const [category, subgroup] = (targetValue ?? fallback).split("::") as [KeywordCategorySlug, string];
      return {
        id,
        decision,
        ...(decision === "approve" ? { category, subgroup } : {}),
      };
    });
    const result = await mutate(ENDPOINT, "POST", { action: "batch-review", items });
    if (!result.error) {
      setDecisions({});
      candidates.refetch();
      taxonomyState.refetch();
    }
  };

  const createSubgroup = async () => {
    const result = await mutate(ENDPOINT, "POST", {
      action: "create-subgroup",
      candidateIds: [...selectedIds],
      category: newCategory,
      subgroupName: newSubgroupName.trim(),
      searchIntent: newIntent,
      topicTemplate: newTopicTemplate.trim(),
      topicAspect: newTopicAspect.trim(),
    });
    if (!result.error) {
      setSelectedIds(new Set());
      setNewSubgroupName("");
      setNewTopicAspect("");
      candidates.refetch();
      taxonomyState.refetch();
    }
  };

  if (candidates.loading) return <AdminLoadingSkeleton variant="table" />;

  return (
    <div className="space-y-5">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--foreground)]">키워드 후보 검토</h2>
              <AdminPill tone={counts.pending > 0 ? "warning" : "white"}>{counts.pending}개 대기</AdminPill>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              SearchAd 연관어 중 기존 주제에 추가할 가치가 있는 키워드를 검토합니다. 각 후보의 결정을 마킹한 뒤 한꺼번에 적용하세요.
            </p>
          </div>
          <AdminActionButton
            tone="dark"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await forceRefetchAdminApi<KeywordTaxonomyCandidate[]>(`${ENDPOINT}?refresh=true`);
                candidates.refetch();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "후보 분석 중…" : "후보 다시 분석"}
          </AdminActionButton>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as KeywordTaxonomyCandidate["status"][]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                status === value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--background)] text-[var(--muted)]"
              }`}
            >
              {STATUS_LABELS[value]} {counts[value]}
            </button>
          ))}
        </div>
      </AdminSurface>

      {(error || candidates.error) && <AdminNotice tone="error">{error ?? candidates.error}</AdminNotice>}

      {taxonomyStateError && <AdminNotice tone="error">{taxonomyStateError}</AdminNotice>}

      {taxonomyState.data && !taxonomyState.data.codeMatchesActive && !taxonomyState.data.codeMatchesPending && (
        <AdminSurface tone="white" className="rounded-2xl border border-sky-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-sky-800">코드 택소노미 변경 감지</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                코드에 정의된 카테고리와 키워드를 다음 통합 수집에 사용할 대기 버전으로 준비합니다. 수집에 실패하면 현재 활성 버전은 유지됩니다.
              </p>
            </div>
            <AdminActionButton
              tone="primary"
              disabled={taxonomyStateLoading || taxonomyState.data.pending !== null}
              onClick={async () => {
                const diff = taxonomyState.data?.codeDiff;
                const changeCount = (diff?.addedKeywords.length ?? 0) + (diff?.removedKeywords.length ?? 0)
                  + (diff?.addedSubgroups.length ?? 0) + (diff?.removedSubgroups.length ?? 0);
                const changeLabel = changeCount > 0 ? `${changeCount}건` : "검색 의도·주제 템플릿 등의 구성 변경";
                if (!window.confirm(`코드 택소노미 ${changeLabel}을 다음 수집용으로 준비할까요?`)) return;
                const result = await mutateTaxonomyState("/api/admin/keyword-taxonomy/state", "POST", { action: "stage-code" });
                if (!result.error) taxonomyState.refetch();
              }}
            >
              코드 변경 적용 준비
            </AdminActionButton>
          </div>
          {taxonomyState.data.pending && (
            <p className="mt-3 text-xs text-amber-700">기존 대기 v{taxonomyState.data.pending.version}을 먼저 수집·적용하거나 전체 취소해야 코드 변경을 준비할 수 있습니다.</p>
          )}
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <DiffList title="코드 추가 키워드" items={taxonomyState.data.codeDiff.addedKeywords.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`)} />
            <DiffList title="코드 삭제 키워드" items={taxonomyState.data.codeDiff.removedKeywords.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`)} />
            <DiffList title="코드 새 서브그룹" items={taxonomyState.data.codeDiff.addedSubgroups.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup}`)} />
            <DiffList title="코드 삭제 서브그룹" items={taxonomyState.data.codeDiff.removedSubgroups.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup}`)} />
          </div>
        </AdminSurface>
      )}

      {taxonomyState.data?.pending && (
        <AdminSurface tone="white" className="rounded-2xl border border-amber-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-800">택소노미 v{taxonomyState.data.pending.version} 적용 대기</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                활성 v{taxonomyState.data.active.version} · 핵심 키워드 {taxonomyState.data.pending.keywords}개 · {getNextAutoSyncLabel()} 또는 수동 데이터 갱신 성공 시 적용
              </p>
            </div>
            <AdminActionButton
              tone="dark"
              disabled={taxonomyStateLoading}
              onClick={async () => {
                const diff = taxonomyState.data?.diff;
                const changeCount = (diff?.addedKeywords.length ?? 0) + (diff?.removedKeywords.length ?? 0)
                  + (diff?.addedSubgroups.length ?? 0) + (diff?.removedSubgroups.length ?? 0);
                if (!window.confirm(`적용 대기 중인 v${taxonomyState.data?.pending?.version} 변경 ${changeCount}건을 모두 취소할까요? 연결된 승인 후보는 다시 검토 대기로 돌아갑니다.`)) return;
                const result = await mutateTaxonomyState("/api/admin/keyword-taxonomy/state", "POST", { action: "discard-pending" });
                if (!result.error) taxonomyState.refetch();
              }}
            >
              대기 변경 전체 취소
            </AdminActionButton>
          </div>
          {taxonomyState.data.diff && (
            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <DiffList title="추가 키워드" items={taxonomyState.data.diff.addedKeywords.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`)} />
              <DiffList title="삭제 키워드" items={taxonomyState.data.diff.removedKeywords.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup} / ${item.keyword}`)} />
              <DiffList title="새 서브그룹" items={taxonomyState.data.diff.addedSubgroups.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup}`)} />
              <DiffList title="삭제 서브그룹" items={taxonomyState.data.diff.removedSubgroups.map((item) => `${getKeywordCategoryLabel(item.category)} / ${item.subgroup}`)} />
            </div>
          )}
        </AdminSurface>
      )}

      {taxonomyState.data && (
        <AdminSurface tone="white" className="rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[var(--foreground)]">최근 택소노미 버전</h3>
          <div className="mt-3 space-y-2">
            {taxonomyState.data.versions.map((version) => (
              <div key={version.version} className="flex flex-col gap-2 rounded-lg bg-[var(--background)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--muted)]">
                  <span className="font-bold text-[var(--foreground)]">v{version.version}</span>
                  {` · ${version.status === "active" ? "활성" : version.status === "pending" ? "적용 대기" : "보관"} · ${version.changeSummary || "변경 요약 없음"}`}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewingVersion(viewingVersion === version.version ? null : version.version)}
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {viewingVersion === version.version ? "닫기" : "보기"}
                  </button>
                  {version.status === "archived" && (
                    <button
                      type="button"
                      disabled={taxonomyStateLoading}
                      onClick={async () => {
                        const pendingWarning = taxonomyState.data?.pending
                          ? ` 현재 적용 대기 중인 v${taxonomyState.data.pending.version} 변경은 취소됩니다.`
                          : "";
                        if (!window.confirm(`v${version.version}을 다음 적용 버전으로 복원할까요?${pendingWarning} 실제 적용은 다음 통합 수집 성공 후 이루어집니다.`)) return;
                        const result = await mutateTaxonomyState("/api/admin/keyword-taxonomy/state", "POST", { action: "restore-version", version: version.version });
                        if (!result.error) taxonomyState.refetch();
                      }}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                    >
                      복원
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {viewingVersion !== null && versionTaxonomy.data && (
            <div className="mt-4">
              <TaxonomyViewer
                title={`v${versionTaxonomy.data.version} 택소노미`}
                taxonomy={versionTaxonomy.data.taxonomy}
                baseTaxonomy={versionTaxonomy.data.activeTaxonomy}
              />
            </div>
          )}
          {viewingVersion !== null && versionTaxonomy.loading && (
            <p className="mt-4 text-center text-xs text-[var(--muted)]">택소노미 로딩 중…</p>
          )}
        </AdminSurface>
      )}

      {status === "pending" && totalDecisions > 0 && (
        <AdminSurface tone="white" className="sticky top-16 z-10 rounded-2xl border-2 border-[var(--color-primary)] p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">검토 결정 {totalDecisions}건</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {[
                  decisionCounts.approve > 0 && `승인 ${decisionCounts.approve}`,
                  decisionCounts.defer > 0 && `보류 ${decisionCounts.defer}`,
                  decisionCounts.reject > 0 && `제외 ${decisionCounts.reject}`,
                ].filter(Boolean).join(" · ")}
                {" · 승인 항목은 단일 택소노미 버전으로 반영됩니다."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AdminActionButton tone="dark" disabled={loading} onClick={() => setDecisions({})}>
                <RotateCcw className="h-4 w-4" />전체 초기화
              </AdminActionButton>
              {decisionCounts.approve > 0 && (
                <AdminActionButton tone="dark" onClick={() => setShowPreview((v) => !v)}>
                  <Eye className="h-4 w-4" />{showPreview ? "미리보기 닫기" : "미리보기"}
                </AdminActionButton>
              )}
              <AdminActionButton tone="primary" disabled={loading} onClick={applyAllDecisions}>
                <Check className="h-4 w-4" />{totalDecisions}건 일괄 적용
              </AdminActionButton>
            </div>
          </div>
        </AdminSurface>
      )}

      {showPreview && previewTaxonomy && (
        <TaxonomyViewer
          title="적용 후 택소노미 미리보기"
          taxonomy={previewTaxonomy}
          baseTaxonomy={taxonomy}
        />
      )}

      {status === "pending" && selectedIds.size > 0 && (
        <AdminSurface tone="white" className="rounded-2xl border border-[var(--border)] p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--foreground)]">선택 {selectedIds.size}개로 새 서브그룹 생성</h3>
          <div className="grid gap-3 lg:grid-cols-4 lg:items-end">
            <label className="flex-1 text-xs font-medium text-[var(--muted)]">
              카테고리
              <select value={newCategory} onChange={(event) => setNewCategory(event.target.value as KeywordCategorySlug)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]">
                {(Object.entries(KEYWORD_CATEGORY_LABELS) as Array<[KeywordCategorySlug, string]>).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--muted)]">
              새 서브그룹명
              <input value={newSubgroupName} onChange={(event) => setNewSubgroupName(event.target.value)} placeholder="예: 수면/진정치료" className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]" />
            </label>
            <label className="text-xs font-medium text-[var(--muted)]">
              검색 의도
              <select value={newIntent} onChange={(event) => setNewIntent(event.target.value as SearchIntent)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]">
                <option value="informational">정보형</option>
                <option value="commercial">비교/검토</option>
                <option value="transactional">전환형</option>
                <option value="navigational">탐색형</option>
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--muted)] lg:col-span-2">
              제목 템플릿
              <input value={newTopicTemplate} onChange={(event) => setNewTopicTemplate(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]" />
            </label>
            <label className="text-xs font-medium text-[var(--muted)] lg:col-span-2">
              콘텐츠 관점
              <input value={newTopicAspect} onChange={(event) => setNewTopicAspect(event.target.value)} placeholder={`${newSubgroupName || "새 주제"} 핵심 정보와 치료 선택 기준`} className="mt-1 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]" />
            </label>
            <AdminActionButton tone="primary" disabled={loading || selectedIds.size < 2 || newSubgroupName.trim().length < 2 || newTopicTemplate.trim().length < 5 || newTopicAspect.trim().length < 2} onClick={createSubgroup}>
              새 그룹 생성
            </AdminActionButton>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">후보를 2~20개 선택하세요. 적용 시 기본 주제 템플릿도 함께 생성됩니다.</p>
        </AdminSurface>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <AdminSurface tone="white" className="rounded-2xl p-8 text-center text-sm text-[var(--muted)]">
            이 상태의 키워드 후보가 없습니다.
          </AdminSurface>
        ) : filtered.map((candidate) => {
          const currentDecision = decisions[candidate.id] as Decision | undefined;
          return (
            <AdminSurface
              key={candidate.id}
              tone="white"
              className={`rounded-2xl p-5 transition-colors ${
                currentDecision === "approve" ? "ring-2 ring-emerald-400/60" :
                currentDecision === "defer" ? "ring-2 ring-amber-400/60" :
                currentDecision === "reject" ? "ring-2 ring-red-400/60 opacity-60" : ""
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {candidate.status === "pending" && (
                      <input
                        type="checkbox"
                        aria-label={`${candidate.keyword} 선택 (새 그룹 생성용)`}
                        checked={selectedIds.has(candidate.id)}
                        onChange={() => setSelectedIds((current) => {
                          const next = new Set(current);
                          if (next.has(candidate.id)) next.delete(candidate.id);
                          else if (next.size < 20) next.add(candidate.id);
                          return next;
                        })}
                        className="h-4 w-4 rounded border-[var(--border)]"
                      />
                    )}
                    <span className="text-base font-bold text-[var(--foreground)]">{candidate.keyword}</span>
                    <AdminPill tone="white">{getKeywordCategoryLabel(candidate.suggestedCategory)}</AdminPill>
                    <AdminPill tone="white">{candidate.suggestedSubgroup}</AdminPill>
                    {currentDecision && (
                      <AdminPill tone={currentDecision === "approve" ? "sky" : "warning"}>
                        {currentDecision === "approve" ? "승인" : currentDecision === "defer" ? "보류" : "제외"}
                      </AdminPill>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{candidate.reason}</p>
                  <p className="mt-1 text-xs font-medium tabular-nums text-[var(--foreground)]">
                    월 {candidate.monthlyVolume.toLocaleString("ko-KR")}회
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {candidate.seenCount}개 스냅샷에서 발견 · 첫 {formatCandidateDate(candidate.firstSeenAt)} · 최근 {formatCandidateDate(candidate.lastSeenAt)} · 신뢰도 {candidate.seenCount >= 3 ? "높음" : candidate.seenCount >= 2 ? "보통" : "초기 후보"}
                  </p>
                </div>
                {candidate.status === "pending" && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {(currentDecision === "approve" || !currentDecision) && (
                      <select
                        aria-label={`${candidate.keyword} 적용 위치`}
                        value={targetById[candidate.id] ?? `${candidate.suggestedCategory}::${candidate.suggestedSubgroup}`}
                        onChange={(event) => setTargetById((current) => ({ ...current, [candidate.id]: event.target.value }))}
                        className="min-h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-xs text-[var(--foreground)]"
                      >
                        {taxonomy.flatMap((category) => category.subGroups.map((subgroup) => (
                          <option key={`${category.slug}:${subgroup.name}`} value={`${category.slug}::${subgroup.name}`}>
                            {getKeywordCategoryLabel(category.slug)} / {subgroup.name}
                          </option>
                        )))}
                      </select>
                    )}
                    <DecisionToggle
                      decision={currentDecision}
                      onDecide={(d) => setDecision(candidate.id, d)}
                      onClear={() => clearDecision(candidate.id)}
                    />
                  </div>
                )}
              </div>
            </AdminSurface>
          );
        })}
      </div>
    </div>
  );
}

function DecisionToggle({
  decision,
  onDecide,
  onClear,
}: {
  decision: Decision | undefined;
  onDecide: (d: Decision) => void;
  onClear: () => void;
}) {
  const btn = (d: Decision, icon: React.ReactNode, label: string, activeColor: string) => {
    const isActive = decision === d;
    return (
      <button
        type="button"
        onClick={() => isActive ? onClear() : onDecide(d)}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? `${activeColor} text-white`
            : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
        }`}
      >
        {icon}{label}
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1 rounded-xl bg-[var(--background)] p-1">
      {btn("approve", <Check className="h-3.5 w-3.5" />, "승인", "bg-emerald-600")}
      {btn("defer", <Clock3 className="h-3.5 w-3.5" />, "보류", "bg-amber-600")}
      {btn("reject", <X className="h-3.5 w-3.5" />, "제외", "bg-red-600")}
    </div>
  );
}

function DiffList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <div className="font-semibold text-[var(--foreground)]">{title} {items.length}개</div>
      {items.length > 0 && <ul className="mt-2 space-y-1 text-[var(--muted)]">{items.slice(0, 10).map((item) => <li key={item}>• {item}</li>)}</ul>}
      {items.length > 10 && <p className="mt-1 text-[var(--muted)]">외 {items.length - 10}개</p>}
    </div>
  );
}

function formatCandidateDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function getNextAutoSyncLabel(): string {
  const now = new Date();
  const kstParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => kstParts.find((item) => item.type === type)?.value ?? "0";
  const currentMinutes = Number(part("hour")) * 60 + Number(part("minute"));
  return currentMinutes < 35 ? "오늘 00:35 자동 수집" : "내일 00:35 자동 수집";
}
