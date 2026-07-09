"use client";

import { memo, useState, useMemo, useCallback } from "react";
import type { KeywordCluster, QueryRow } from "./keyword-cluster";
import type { SemanticCluster, TableSortKey, SortDirection } from "./search-types";
import { formatCtr } from "./search-utils";

// ---------------------------------------------------------------
// SimilarityBadge (memoized)
// ---------------------------------------------------------------

const SimilarityBadge = memo(function SimilarityBadge({ score }: { score: number }) {
  if (score >= 1) return null;
  const pct = Math.round(score * 100);
  const tone =
    pct >= 75
      ? "bg-emerald-100 text-emerald-700"
      : pct >= 60
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${tone}`}
      title={`대표 키워드 대비 유사도 ${pct}% — 낮을수록 잘못 묶였을 가능성`}
    >
      {pct}%
    </span>
  );
});

// ---------------------------------------------------------------
// ClusterRow (memoized)
// ---------------------------------------------------------------

const ClusterRow = memo(function ClusterRow({
  cluster,
  onSelectQuery,
  selectedQuery,
}: {
  cluster: KeywordCluster;
  onSelectQuery?: (query: string) => void;
  selectedQuery?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = cluster.keywords.length > 1;

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
        <td className="px-3 py-2 text-left">
          <div className="flex items-center gap-1.5">
            {isMulti && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-[var(--muted)] hover:bg-[var(--border)]"
                aria-label={expanded ? "접기" : "펼치기"}
                aria-expanded={expanded}
              >
                {expanded ? "▾" : "▸"}
              </button>
            )}
            {!isMulti && <span className="inline-block w-5" />}
            <button
              type="button"
              onClick={() => onSelectQuery?.(cluster.representative)}
              className={`block max-w-[200px] truncate text-left sm:max-w-xs ${
                selectedQuery === cluster.representative
                  ? "font-medium text-[var(--color-primary)]"
                  : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
              }`}
              title={cluster.representative}
            >
              {cluster.representative}
            </button>
            {isMulti && (
              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                +{cluster.keywords.length - 1}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {cluster.impressions.toLocaleString("ko-KR")}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {cluster.clicks.toLocaleString("ko-KR")}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {formatCtr(cluster.ctr)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {cluster.position}
        </td>
      </tr>
      {expanded &&
        cluster.keywords.map((kw) => (
          <tr
            key={kw.query}
            className="border-b border-[var(--border)] bg-[var(--surface)]/50"
          >
            <td className="py-1.5 pl-11 pr-3 text-left">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectQuery?.(kw.query)}
                  className={`block max-w-[160px] truncate text-left text-sm sm:max-w-[200px] ${
                    selectedQuery === kw.query
                      ? "font-medium text-[var(--color-primary)]"
                      : "text-[var(--muted)] hover:text-[var(--color-primary)]"
                  }`}
                  title={kw.query}
                >
                  {kw.query}
                </button>
                <SimilarityBadge score={kw.similarity} />
              </div>
            </td>
            <td className="px-3 py-1.5 text-right text-sm tabular-nums text-[var(--muted)]">
              {kw.impressions.toLocaleString("ko-KR")}
            </td>
            <td className="px-3 py-1.5 text-right text-sm tabular-nums text-[var(--muted)]">
              {kw.clicks.toLocaleString("ko-KR")}
            </td>
            <td className="px-3 py-1.5 text-right text-sm tabular-nums text-[var(--muted)]">
              {formatCtr(kw.ctr)}
            </td>
            <td className="px-3 py-1.5 text-right text-sm tabular-nums text-[var(--muted)]">
              {kw.position}
            </td>
          </tr>
        ))}
    </>
  );
});

// ---------------------------------------------------------------
// Props
// ---------------------------------------------------------------

type Props = {
  queries: QueryRow[];
  semanticClusters?: SemanticCluster[] | null;
  onSelectQuery?: (query: string) => void;
  selectedQuery?: string | null;
};

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

/** Convert server-side SemanticCluster[] to KeywordCluster[] for rendering */
function fromSemanticClusters(semantic: SemanticCluster[]): KeywordCluster[] {
  return semantic.map((sc) => ({
    representative: sc.representative,
    keywords: sc.keywords.map((kw) => ({
      query: kw.query,
      impressions: kw.impressions,
      clicks: kw.clicks,
      ctr: kw.ctr,
      position: kw.position,
      similarity: kw.similarity,
    })),
    impressions: sc.impressions,
    clicks: sc.clicks,
    ctr: sc.ctr,
    position: sc.position,
  }));
}

const SORT_COLUMNS: { key: TableSortKey; label: string }[] = [
  { key: "impressions", label: "노출" },
  { key: "clicks", label: "클릭" },
  { key: "ctr", label: "CTR (%)" },
  { key: "position", label: "순위" },
];

function SortableHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: TableSortKey;
  currentKey: TableSortKey | null;
  direction: SortDirection;
  onSort: (key: TableSortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  const ariaSort = isActive ? (direction === "desc" ? "descending" : "ascending") : "none";
  return (
    <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-0.5 hover:text-[var(--foreground)]"
      >
        {label}
        {isActive && (
          <span className="text-[10px]">{direction === "desc" ? "▾" : "▴"}</span>
        )}
      </button>
    </th>
  );
}

export function ClusteredKeywordTable({
  queries,
  semanticClusters,
  onSelectQuery,
  selectedQuery,
}: Props) {
  const usingSemantic = !!semanticClusters && semanticClusters.length > 0;
  const [sortKey, setSortKey] = useState<TableSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = useCallback((key: TableSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
        return key;
      }
      setSortDirection(key === "position" ? "asc" : "desc");
      return key;
    });
  }, []);

  const clusters = useMemo(() => {
    if (usingSemantic) return fromSemanticClusters(semanticClusters!);
    // 임베딩 데이터 없으면 각 키워드를 단독 클러스터로 표시
    return queries.map((q) => ({
      representative: q.query,
      keywords: [{ ...q, similarity: 1 }],
      impressions: q.impressions,
      clicks: q.clicks,
      ctr: q.ctr,
      position: q.position,
    }));
  }, [queries, semanticClusters, usingSemantic]);

  const sortedClusters = useMemo(() => {
    if (!sortKey) return clusters;
    const sorted = [...clusters];
    sorted.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDirection === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    });
    return sorted;
  }, [clusters, sortKey, sortDirection]);

  const multiCount = useMemo(
    () => clusters.filter((c) => c.keywords.length > 1).length,
    [clusters],
  );

  return (
    <div className="space-y-3">
      {multiCount > 0 && (
        <p className="text-xs text-[var(--muted)]">
          {usingSemantic && (
            <span className="mr-1.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              AI
            </span>
          )}
          유사 키워드 {multiCount}그룹 발견 — 합산 지표로 실제 검색 의도를 파악합니다.
        </p>
      )}
      <div className="max-h-[36rem] overflow-y-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--background)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)]">
                키워드
              </th>
              {SORT_COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  label={col.label}
                  sortKey={col.key}
                  currentKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedClusters.map((cluster) => (
              <ClusterRow
                key={cluster.representative}
                cluster={cluster}
                onSelectQuery={onSelectQuery}
                selectedQuery={selectedQuery}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
