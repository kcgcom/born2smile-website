"use client";

import { useMemo, useState } from "react";
import { getKeywordCategoryLabel, type KeywordCategorySlug, type SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { DataTable } from "../DataTable";
import { CategoryBadge, ValueScoreBadge, SearchIntentBadge, calcRelatedVolume } from "./shared";
import type { ContentGapItem } from "./shared";
import { INTENT_FILTER_OPTIONS, buildCrossKeywords, useGapTableSort } from "./strategy-shared";

interface EvidenceDataSectionProps {
  contentGap: ContentGapItem[];
}

export function EvidenceDataSection({
  contentGap,
}: EvidenceDataSectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<KeywordCategorySlug | "all">("all");
  const [intentFilter, setIntentFilter] = useState<SearchIntent | "all">("all");
  const [expandedRelated, setExpandedRelated] = useState<Set<string>>(() => new Set());
  const { sortKey: gapSortKey, sortDirection: gapSortDir, handleSort: handleGapSort, sort: sortGapRows } =
    useGapTableSort("monthlyVolume");

  const crossKeywords = useMemo(() => buildCrossKeywords(contentGap), [contentGap]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<KeywordCategorySlug, number>();
    contentGap.forEach((item) => counts.set(item.slug, (counts.get(item.slug) ?? 0) + 1));
    return Array.from(counts, ([value, count]) => ({
      value,
      label: getKeywordCategoryLabel(value),
      count,
    }));
  }, [contentGap]);

  const filteredGap = useMemo(
    () => contentGap.filter((item) => {
      if (categoryFilter !== "all" && item.slug !== categoryFilter) return false;
      if (intentFilter !== "all" && item.searchIntent !== intentFilter) return false;
      return true;
    }),
    [categoryFilter, contentGap, intentFilter],
  );

  const gapRows = useMemo(
    () => sortGapRows(filteredGap).map((item) => ({
      ...item,
      id: `${item.slug}-${item.subGroup}`,
    })),
    [filteredGap, sortGapRows],
  );

  const maxVolume = useMemo(() => Math.max(...filteredGap.map((g) => g.monthlyVolume ?? 0), 1), [filteredGap]);
  if (contentGap.length === 0 && crossKeywords.length === 0) return null;

  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-col gap-6">
        {crossKeywords.length > 0 && (
          <section className="order-2 space-y-3">
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
          <section className="order-1">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">콘텐츠 갭 분석</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                공백 점수는 대표 콘텐츠의 주제 직접성·본문 깊이·개념 다양성·최신성을 평가합니다. 검색량과 검색 추이는 반영하지 않습니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">HIGH ≥55 · 큰 공백</span>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">MED ≥25 · 부분 공백</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">LOW &lt;25 · 대체로 충족</span>
              </div>
              <div className="mt-3 flex items-start gap-2">
                <span className="w-14 shrink-0 pt-1 text-xs font-medium text-[var(--muted)]">카테고리</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("all")}
                    aria-pressed={categoryFilter === "all"}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      categoryFilter === "all"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                    }`}
                  >
                    전체 <span className="opacity-70">({contentGap.length})</span>
                  </button>
                  {categoryOptions.map((option) => {
                    const isActive = categoryFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategoryFilter(option.value)}
                        aria-pressed={isActive}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                        }`}
                      >
                        {option.label} <span className="opacity-70">({option.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <span className="w-14 shrink-0 pt-1 text-xs font-medium text-[var(--muted)]">검색 의도</span>
                <div className="flex flex-wrap gap-1.5">
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
                      {isActive && (intentFilter !== "all" || categoryFilter !== "all") && (
                        <span className="ml-1 opacity-70">({filteredGap.length})</span>
                      )}
                    </button>
                  );
                })}
                </div>
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
                      const rowKey = `${String(row.slug)}:${String(row.subGroup)}`;
                      const isExpanded = expandedRelated.has(rowKey);
                      const visibleRelated = isExpanded ? related : related.slice(0, 10);
                      const hasKeywords = direct.length > 0 || related.length > 0;
                      return (
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CategoryBadge category={row.slug as KeywordCategorySlug} />
                            <span className="font-medium text-[var(--foreground)]">{String(row.subGroup)}</span>
                          </div>
                          {hasKeywords && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {direct.map((dk) => (
                                <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${dk.volume.toLocaleString("ko-KR")}회`}>
                                  {dk.keyword}
                                  <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                                </span>
                              ))}
                              {visibleRelated.map((rk) => (
                                <span key={rk.keyword} className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700" title={`연관 키워드 · 월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                                  {rk.keyword}
                                  <span className="ml-0.5 text-violet-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                                </span>
                              ))}
                              {related.length > 10 && (
                                <button
                                  type="button"
                                  className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)] hover:underline"
                                  onClick={() => setExpandedRelated((current) => {
                                    const next = new Set(current);
                                    if (next.has(rowKey)) next.delete(rowKey);
                                    else next.add(rowKey);
                                    return next;
                                  })}
                                >
                                  {isExpanded ? "연관 키워드 접기" : `연관 키워드 ${related.length - 10}개 더 보기`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "searchIntent",
                    label: "검색 의도",
                    align: "left",
                    className: "w-24 whitespace-nowrap",
                    render: (row) => row.searchIntent
                      ? <SearchIntentBadge intent={row.searchIntent as SearchIntent} />
                      : null,
                  },
                  {
                    key: "monthlyVolume",
                    label: "주제 검색량",
                    align: "right",
                    sortable: true,
                    className: "w-32 whitespace-nowrap",
                    render: (row) => {
                      const mv = row.monthlyVolume as number | null;
                      const barPct = mv != null ? Math.min(100, (mv / maxVolume) * 100) : 0;
                      return (
                        <div>
                          <span className="tabular-nums font-medium text-[var(--foreground)]">
                            {mv != null ? (
                              <>
                                {row.isEstimated ? "≈ " : ""}
                                {mv.toLocaleString("ko-KR")}
                                <span className="ml-0.5 text-[10px] font-normal text-[var(--muted)]">/월</span>
                              </>
                            ) : (
                              <span className="font-normal text-[var(--muted)]">
                                {Number(row.currentAvg).toFixed(1)}
                                <span className="ml-0.5 text-[10px]">(상대)</span>
                              </span>
                            )}
                          </span>
                          {mv != null && (
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
                    label: "콘텐츠 근거",
                    align: "right",
                    sortable: true,
                    className: "w-36 whitespace-nowrap",
                    render: (row) => {
                      const direct = Number(row.directEvidenceCount ?? 0);
                      const indirect = Number(row.indirectEvidenceCount ?? 0);
                      return (
                        <div className="text-right text-xs tabular-nums">
                          <span className={direct > 0 ? "font-medium text-[var(--foreground)]" : "font-medium text-amber-700"}>
                            {direct > 0 ? `직접 ${direct}` : "직접 없음"}
                          </span>
                          {indirect > 0 && <span className="ml-1 text-[var(--muted)]">· 간접 {indirect}</span>}
                        </div>
                      );
                    },
                  },
                  {
                    key: "contentGapScore",
                    label: "공백 점수",
                    align: "right",
                    sortable: true,
                    className: "w-32 whitespace-nowrap",
                    render: (row) => {
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="tabular-nums font-semibold text-[var(--foreground)]">{Number(row.contentGapScore).toFixed(0)}</span>
                          <ValueScoreBadge score={Number(row.contentGapScore)} />
                        </div>
                      );
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
                  { key: "monthlyVolume", label: "주제 검색량" },
                  { key: "contentGapScore", label: "공백 점수" },
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
                  const direct = item.directKeywords ?? [];
                  const related = item.relatedKeywords ?? [];
                  const rowKey = `${item.slug}:${item.subGroup}`;
                  const isExpanded = expandedRelated.has(rowKey);
                  const visibleRelated = isExpanded ? related : related.slice(0, 10);
                  const topRelatedCount = Math.min(10, related.length);
                  const topRelatedVolume = calcRelatedVolume(item, 10);
                  const hasKeywords = direct.length > 0 || related.length > 0;
                  return (
                    <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0"><CategoryBadge category={item.category} /></span>
                        {item.searchIntent && <span className="shrink-0"><SearchIntentBadge intent={item.searchIntent} /></span>}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{item.subGroup}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="text-xs tabular-nums text-[var(--foreground)]">
                            {item.monthlyVolume != null ? (
                              <>{item.isEstimated ? "≈" : ""}{item.monthlyVolume.toLocaleString("ko-KR")}<span className="text-[var(--muted)]">/월</span></>
                            ) : (
                              <span className="text-[var(--muted)]">{item.currentAvg.toFixed(1)}<span className="text-[9px]">(상대)</span></span>
                            )}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">{item.contentGapScore.toFixed(0)}</span>
                          <ValueScoreBadge score={item.contentGapScore} />
                        </span>
                      </div>
                      {related.length > 0 && (
                        <p className="mt-1 text-[10px] text-[var(--muted)]">
                          연관 키워드 {related.length}개 · 상위 {topRelatedCount}개 {topRelatedVolume.toLocaleString("ko-KR")}/월
                        </p>
                      )}
                      <p className={`mt-1 text-[10px] tabular-nums ${item.directEvidenceCount > 0 ? "text-[var(--muted)]" : "font-medium text-amber-700"}`}>
                        콘텐츠 근거 · {item.directEvidenceCount > 0 ? `직접 ${item.directEvidenceCount}` : "직접 없음"}
                        {item.indirectEvidenceCount > 0 ? ` · 간접 ${item.indirectEvidenceCount}` : ""}
                      </p>
                      {hasKeywords && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {direct.map((dk) => (
                            <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                              {dk.keyword}
                              <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                            </span>
                          ))}
                          {visibleRelated.map((rk) => (
                            <span key={rk.keyword} className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700">
                              {rk.keyword}
                              <span className="ml-0.5 text-violet-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                            </span>
                          ))}
                          {related.length > 10 && (
                            <button
                              type="button"
                              className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)] hover:underline"
                              onClick={() => setExpandedRelated((current) => {
                                const next = new Set(current);
                                if (next.has(rowKey)) next.delete(rowKey);
                                else next.add(rowKey);
                                return next;
                              })}
                            >
                              {isExpanded ? "접기" : `${related.length - 10}개 더 보기`}
                            </button>
                          )}
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
    </AdminSurface>
  );
}
