"use client";

import React from "react";
import { AdminSurface } from "@/components/admin/AdminChrome";

interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: string;
  emptyMessage?: string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  scrollClassName?: string;
  stickyHeader?: boolean;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  if (direction === "asc") return <span aria-hidden="true" className="ml-1 text-[var(--color-primary)]">▲</span>;
  if (direction === "desc") return <span aria-hidden="true" className="ml-1 text-[var(--color-primary)]">▼</span>;
  return <span aria-hidden="true" className="ml-1 text-[var(--border)]">⇅</span>;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  emptyMessage = "데이터가 없습니다",
  sortKey,
  sortDirection,
  onSort,
  scrollClassName,
  stickyHeader = false,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <AdminSurface tone="white" className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/85 px-4 py-10 text-center">
        <svg
          className="h-8 w-8 text-[var(--border)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
          />
        </svg>
        <span className="text-sm text-[var(--muted)]">{emptyMessage}</span>
      </AdminSurface>
    );
  }

  return (
    <AdminSurface tone="white" className="overflow-hidden rounded-2xl px-0 py-0">
      <div className={`overflow-x-auto ${scrollClassName ?? ""}`}>
        <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]/80">
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              const direction = isSorted ? (sortDirection ?? null) : null;
              const alignClass =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                    ? "text-center"
                    : "text-left";
              return (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium text-[var(--muted)] ${alignClass} ${
                    stickyHeader ? "sticky top-0 z-10 bg-[var(--background)]/95 backdrop-blur" : ""
                  } ${
                    col.sortable && onSort
                      ? "cursor-pointer select-none hover:text-[var(--foreground)]"
                      : ""
                  }`}
                  onClick={
                    col.sortable && onSort ? () => onSort(col.key) : undefined
                  }
                  aria-sort={
                    isSorted
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && onSort && (
                      <SortIcon direction={direction} />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white/90">
          {rows.map((row) => (
            <tr
              key={String(row[keyField])}
              className="border-b border-[var(--background)] transition-colors hover:bg-[var(--background)]/70"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-[var(--foreground)] ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </AdminSurface>
  );
}
