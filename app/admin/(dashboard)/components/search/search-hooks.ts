"use client";

import { useMemo, useState } from "react";
import type { SearchMetricRow, SortDirection, TableSortKey } from "./search-types";
import { DEFAULT_SORT_DIRECTION } from "./search-utils";

export function useSearchTableSort<T extends SearchMetricRow>(
  rows: T[],
  initialKey: TableSortKey = "impressions",
) {
  const [sortKey, setSortKey] = useState<TableSortKey>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    DEFAULT_SORT_DIRECTION[initialKey],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const direction = sortDirection === "asc" ? 1 : -1;

      if (aValue === bValue) return b.impressions - a.impressions;
      return (aValue < bValue ? -1 : 1) * direction;
    });
  }, [rows, sortDirection, sortKey]);

  const handleSort = (key: string) => {
    const nextKey = key as TableSortKey;
    if (!(nextKey in DEFAULT_SORT_DIRECTION)) return;

    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(DEFAULT_SORT_DIRECTION[nextKey]);
  };

  return { sortedRows, sortKey, sortDirection, handleSort };
}
