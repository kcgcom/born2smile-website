"use client";

import { memo, useState, useMemo } from "react";
import { clusterKeywords, type KeywordCluster, type QueryRow } from "./keyword-cluster";
import { formatCtr } from "./search-utils";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const THRESHOLD_PRESETS = [
  { value: 0.45, label: "느슨하게" },
  { value: 0.55, label: "보통" },
  { value: 0.65, label: "엄격하게" },
] as const;

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
  onSelectQuery?: (query: string) => void;
  selectedQuery?: string | null;
};

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function ClusteredKeywordTable({
  queries,
  onSelectQuery,
  selectedQuery,
}: Props) {
  const [threshold, setThreshold] = useState(0.55);

  const clusters = useMemo(
    () => clusterKeywords(queries, threshold),
    [queries, threshold],
  );

  const multiCount = useMemo(
    () => clusters.filter((c) => c.keywords.length > 1).length,
    [clusters],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1">
          <span className="text-[11px] text-[var(--muted)]">민감도</span>
          {THRESHOLD_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setThreshold(preset.value)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                threshold === preset.value
                  ? "bg-blue-100 text-blue-700"
                  : "text-[var(--muted)] hover:bg-[var(--surface)]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {multiCount > 0 && (
          <p className="text-xs text-[var(--muted)]">
            유사 키워드 {multiCount}그룹 발견 — 합산 지표로 실제 검색 의도를 파악합니다.
          </p>
        )}
      </div>
      <div className="max-h-[36rem] overflow-y-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--background)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)]">
                키워드
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]">
                노출
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]">
                클릭
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]">
                CTR (%)
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]">
                순위
              </th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cluster) => (
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
