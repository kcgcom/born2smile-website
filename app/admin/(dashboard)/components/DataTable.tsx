"use client";

import React from "react";
import { Table } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";

interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  className?: string;
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
  expandedRowKey?: string;
  renderExpandedRow?: (row: T) => React.ReactNode;
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
  expandedRowKey,
  renderExpandedRow,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <AdminSurface tone="white" className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--background)]/85 px-4 py-10 text-center">
        <Table className="h-8 w-8 text-[var(--border)]" aria-hidden="true" />
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
                  } ${col.className ?? ""}`}
                  aria-sort={
                    isSorted
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex cursor-pointer select-none items-center bg-transparent border-0 p-0 font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      {col.label}
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    <span className="inline-flex items-center">
                      {col.label}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-[var(--background)]/90">
          {rows.map((row) => {
            const rowKey = String(row[keyField]);
            const isExpanded = expandedRowKey === rowKey;
            return (
              <React.Fragment key={rowKey}>
                <tr className="border-b border-[var(--background)] transition-colors hover:bg-[var(--background)]/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-[var(--foreground)] ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left"
                      } ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
                {isExpanded && renderExpandedRow && (
                  <tr className="border-b border-[var(--background)] bg-[var(--background)]/80">
                    <td colSpan={columns.length} className="px-3 py-3">
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        </table>
      </div>
    </AdminSurface>
  );
}
