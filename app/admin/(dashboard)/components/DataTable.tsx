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
  mobileCards?: boolean;
  desktopTable?: boolean;
}

function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  if (direction === "asc") return <span aria-hidden="true" className="ml-1 text-[var(--color-primary)]">▲</span>;
  if (direction === "desc") return <span aria-hidden="true" className="ml-1 text-[var(--color-primary)]">▼</span>;
  return <span aria-hidden="true" className="ml-1 text-[var(--border)]">⇅</span>;
}

export function DataTable<T extends object>({
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
  mobileCards = false,
  desktopTable = true,
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
    <>
      {mobileCards && <div className="space-y-3 md:hidden">
        {onSort && <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex min-w-0 items-center gap-2">
            정렬
            <select aria-label="정렬 기준" value={sortKey ?? ""} onChange={event => onSort(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2">
              <option value="" disabled>기준 선택</option>
              {columns.filter(column => column.sortable).map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </label>
          {sortKey && <button type="button" onClick={() => onSort(sortKey)} className="min-h-11 rounded-lg border border-slate-300 px-3">{sortDirection === "asc" ? "오름차순 ↑" : "내림차순 ↓"}</button>}
        </div>}
        <ul aria-label="성과 요약" className="space-y-3">
          {rows.map(row => {
            const key = String(row[keyField as keyof T]);
            const primary = columns[0];
            return <li key={key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 [&_.truncate]:overflow-visible [&_.truncate]:whitespace-normal [&_.truncate]:text-clip [&_button]:max-w-none [&_button]:break-words [&_p]:break-all">
              <div className="min-w-0 break-words text-sm font-semibold leading-6">{primary.render ? primary.render(row) : String(row[primary.key as keyof T] ?? "")}</div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {columns.slice(1).map(column => <div key={column.key} className="min-w-0">
                  <dt className="break-keep text-xs text-slate-600">{column.label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium tabular-nums">{column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}</dd>
                </div>)}
              </dl>
              {expandedRowKey === key && renderExpandedRow && <div className="mt-3">{renderExpandedRow(row)}</div>}
            </li>;
          })}
        </ul>
      </div>}
    {desktopTable && <AdminSurface tone="white" className={`overflow-hidden rounded-2xl px-0 py-0 ${mobileCards ? "hidden md:block" : ""}`}>
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
                      className="inline-flex min-h-11 cursor-pointer select-none items-center justify-center rounded-md border-0 bg-transparent px-2 font-medium text-[var(--muted)] hover:bg-slate-200/60 hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
            const rowKey = String(row[keyField as keyof T]);
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
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
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
    </AdminSurface>}
    </>
  );
}
