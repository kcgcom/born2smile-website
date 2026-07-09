"use client";

import { useMemo, useState } from "react";
import type { KeywordCategorySlug, SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { DataTable } from "../DataTable";
import { BusinessValueBadge, CategoryBadge, GapScoreBadge, SearchIntentBadge, calcTotalVolume } from "./shared";
import type { ContentGapItem, InsightActionItem, PageUpdateOpportunityItem } from "./shared";
import { ACTION_LABELS, INTENT_FILTER_OPTIONS, buildCrossKeywords, useGapTableSort } from "./strategy-shared";

interface EvidenceDataSectionProps {
  contentGap: ContentGapItem[];
  insightActions: InsightActionItem[];
  pageOpportunities: PageUpdateOpportunityItem[];
}

export function EvidenceDataSection({
  contentGap,
  insightActions,
  pageOpportunities,
}: EvidenceDataSectionProps) {
  const [intentFilter, setIntentFilter] = useState<SearchIntent | "all">("all");
  const { sortKey: gapSortKey, sortDirection: gapSortDir, handleSort: handleGapSort, sort: sortGapRows } =
    useGapTableSort("monthlyVolume");

  const crossKeywords = useMemo(() => buildCrossKeywords(contentGap), [contentGap]);

  if (contentGap.length === 0 && crossKeywords.length === 0) return null;

  const filteredGap = intentFilter === "all"
    ? contentGap
    : contentGap.filter((item) => item.searchIntent === intentFilter);

  const gapRows = useMemo(
    () => sortGapRows(filteredGap).map((item) => ({
      ...item,
      id: `${item.slug}-${item.subGroup}`,
    })),
    [filteredGap, sortGapRows],
  );

  const maxVolume = useMemo(() => Math.max(...contentGap.map((g) => calcTotalVolume(g)), 1), [contentGap]);
  const actionByKey = useMemo(() => new Map(insightActions.map((item) => [`${item.slug}:${item.subGroup}`, item])), [insightActions]);
  const pageOpportunityByKey = useMemo(() => new Map(pageOpportunities.map((item) => [`${item.slug}:${item.subGroup}`, item])), [pageOpportunities]);

  return (
    <AdminDisclosureSection
      title="근거 데이터"
      description="왜 이 주제가 중요한지 검색 수요와 교차 신호를 함께 봅니다."
      countLabel={`${gapRows.length}개`}
      defaultOpen={false}
      collapsedMessage="필요할 때만 펼쳐 봅니다."
      titleLevel="h2"
    >
      <div className="space-y-6">
        {crossKeywords.length > 0 && (
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">교차 키워드</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">여러 카테고리에 걸쳐 반복되는 키워드는 허브 글이나 FAQ 공통 보강 후보입니다.</p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
              <DataTable
                columns={[
                  { key: "keyword", label: "키워드", align: "left" },
                  {
                    key: "categories",
                    label: "카테고리",
                    align: "left",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        {(row.categories as KeywordCategorySlug[]).map((c) => (
                          <CategoryBadge key={c} category={c} />
                        ))}
                      </div>
                    ),
                  },
                  { key: "categoryCount", label: "카테고리 수", align: "right" },
                  {
                    key: "volume",
                    label: "월 검색량",
                    align: "right",
                    render: (row) => (
                      <span className="tabular-nums">
                        {(row.volume as number).toLocaleString("ko-KR")}
                      </span>
                    ),
                  },
                ]}
                rows={crossKeywords as unknown as Record<string, unknown>[]}
                keyField="keyword"
                emptyMessage="교차 키워드가 없습니다"
              />
            </div>
          </section>
        )}

        {contentGap.length > 0 && (
          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">콘텐츠 갭 분석</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                갭 점수 = 검색량(70%) + 콘텐츠 부족도(25%)
                &nbsp;·&nbsp;
                <span className="text-red-600 font-medium">HIGH(≥70): 시급</span>
                &nbsp;·&nbsp;
                <span className="text-yellow-600 font-medium">MED(≥40): 권장</span>
                &nbsp;·&nbsp;
                <span className="text-green-600 font-medium">LOW(&lt;40)</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INTENT_FILTER_OPTIONS.map((opt) => {
                  const isActive = intentFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIntentFilter(opt.value)}
                      aria-pressed={isActive}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                      }`}
                    >
                      {opt.label}
                      {isActive && intentFilter !== "all" && (
                        <span className="ml-1 opacity-70">({filteredGap.length})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:block rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
              <DataTable
                columns={[
                  {
                    key: "subGroup",
                    label: "키워드 영역",
                    align: "left",
                    render: (row) => {
                      const direct = (row.directKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                      const related = (row.relatedKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                      const hasKeywords = direct.length > 0 || related.length > 0;
                      return (
                        <div>
                          <span className="font-medium text-[var(--foreground)]">{String(row.subGroup)}</span>
                          {hasKeywords && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {direct.map((dk) => (
                                <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${dk.volume.toLocaleString("ko-KR")}회`}>
                                  {dk.keyword}
                                  <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                                </span>
                              ))}
                              {related.map((rk) => (
                                <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                                  {rk.keyword}
                                  <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "category",
                    label: "카테고리",
                    align: "left",
                    render: (row) => <CategoryBadge category={row.category as KeywordCategorySlug} />,
                  },
                  {
                    key: "searchIntent",
                    label: "검색 의도",
                    align: "left",
                    render: (row) => row.searchIntent
                      ? <SearchIntentBadge intent={row.searchIntent as SearchIntent} />
                      : null,
                  },
                  {
                    key: "actionType",
                    label: "추천 액션",
                    align: "left",
                    render: (row) => {
                      const item = actionByKey.get(`${row.slug as KeywordCategorySlug}:${String(row.subGroup)}`);
                      if (!item) return <span className="text-xs text-[var(--muted)]">-</span>;
                      return (
                        <div className="space-y-1">
                          <span className="inline-flex items-center rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                            {ACTION_LABELS[item.actionType]}
                          </span>
                          <div>
                            <BusinessValueBadge value={item.businessValue} />
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "monthlyVolume",
                    label: "검색량",
                    align: "right",
                    sortable: true,
                    render: (row) => {
                      const mv = row.monthlyVolume as number | null;
                      const totalVolume = mv != null ? calcTotalVolume(row as unknown as ContentGapItem) : null;
                      const barPct = totalVolume != null ? Math.min(100, (totalVolume / maxVolume) * 100) : 0;
                      return (
                        <div>
                          <span className="tabular-nums font-medium text-[var(--foreground)]">
                            {totalVolume != null ? (
                              <>
                                {row.isEstimated ? "≈ " : ""}
                                {totalVolume.toLocaleString("ko-KR")}
                                <span className="ml-0.5 text-[10px] font-normal text-[var(--muted)]">/월</span>
                              </>
                            ) : (
                              <span className="font-normal text-[var(--muted)]">
                                {Number(row.currentAvg).toFixed(1)}
                                <span className="ml-0.5 text-[10px]">(상대)</span>
                              </span>
                            )}
                          </span>
                          {totalVolume != null && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                              <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${barPct}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "existingPostCount",
                    label: "포스트 수",
                    align: "right",
                    sortable: true,
                    render: (row) => <span className="tabular-nums text-[var(--foreground)]">{Number(row.existingPostCount)}</span>,
                  },
                  {
                    key: "gapScore",
                    label: "갭 점수",
                    align: "right",
                    sortable: true,
                    render: (row) => (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="tabular-nums text-[var(--foreground)]">{Number(row.gapScore).toFixed(0)}</span>
                        <GapScoreBadge score={Number(row.gapScore)} />
                      </div>
                    ),
                  },
                  {
                    key: "pageUpdateScore",
                    label: "페이지 보강",
                    align: "right",
                    render: (row) => {
                      const item = pageOpportunityByKey.get(`${row.slug as KeywordCategorySlug}:${String(row.subGroup)}`);
                      if (!item) return <span className="text-xs text-[var(--muted)]">-</span>;
                      return <span className="tabular-nums text-[var(--foreground)]">{item.pageUpdateScore}</span>;
                    },
                  },
                ]}
                rows={gapRows as unknown as Record<string, unknown>[]}
                keyField="id"
                emptyMessage="콘텐츠 갭 데이터가 없습니다"
                sortKey={gapSortKey}
                sortDirection={gapSortDir}
                onSort={handleGapSort}
              />
            </div>
            <div className="block sm:hidden space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {([
                  { key: "monthlyVolume", label: "검색량" },
                  { key: "gapScore", label: "갭 점수" },
                ] as const).map((chip) => {
                  const isActive = gapSortKey === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => handleGapSort(chip.key)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                      }`}
                    >
                      {chip.label}
                      {isActive && <span className="ml-0.5">{gapSortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  );
                })}
              </div>
              {gapRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">콘텐츠 갭 데이터가 없습니다</p>
              ) : (
                gapRows.map((item) => {
                  const totalVolume = item.monthlyVolume != null ? calcTotalVolume(item) : null;
                  const direct = item.directKeywords ?? [];
                  const related = item.relatedKeywords ?? [];
                  const hasKeywords = direct.length > 0 || related.length > 0;
                  const action = actionByKey.get(`${item.slug}:${item.subGroup}`);
                  const pageOpportunity = pageOpportunityByKey.get(`${item.slug}:${item.subGroup}`);
                  return (
                    <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0"><CategoryBadge category={item.category} /></span>
                        {item.searchIntent && <span className="shrink-0"><SearchIntentBadge intent={item.searchIntent} /></span>}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{item.subGroup}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="text-xs tabular-nums text-[var(--foreground)]">
                            {totalVolume != null ? (
                              <>{item.isEstimated ? "≈" : ""}{totalVolume.toLocaleString("ko-KR")}<span className="text-[var(--muted)]">/월</span></>
                            ) : (
                              <span className="text-[var(--muted)]">{item.currentAvg.toFixed(1)}<span className="text-[9px]">(상대)</span></span>
                            )}
                          </span>
                          <GapScoreBadge score={item.gapScore} />
                        </span>
                      </div>
                      {(action || pageOpportunity) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {action && (
                            <>
                              <span className="inline-flex items-center rounded-full bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                                {ACTION_LABELS[action.actionType]}
                              </span>
                              <BusinessValueBadge value={action.businessValue} />
                            </>
                          )}
                          {pageOpportunity && (
                            <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">
                              페이지 {pageOpportunity.pageUpdateScore}
                            </span>
                          )}
                        </div>
                      )}
                      {hasKeywords && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {direct.map((dk) => (
                            <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                              {dk.keyword}
                              <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                            </span>
                          ))}
                          {related.map((rk) => (
                            <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                              {rk.keyword}
                              <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </AdminDisclosureSection>
  );
}
