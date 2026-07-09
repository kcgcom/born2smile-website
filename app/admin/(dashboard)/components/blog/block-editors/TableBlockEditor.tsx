"use client";

import type { BlogBlock } from "@/lib/blog/types";
import { inputClass } from "./shared";

export function TableBlockEditor({
  block,
  idx,
  setBlock,
  hasError,
}: {
  block: Extract<BlogBlock, { type: "table" }>;
  idx: number;
  setBlock: (idx: number, block: BlogBlock) => void;
  hasError: boolean;
}) {
  const updateHeader = (headerIdx: number, value: string) => {
    const headers = block.headers.map((header, i) => (i === headerIdx ? value : header));
    const rows = block.rows.map((row) => {
      if (row.length === headers.length) return row;
      return [...row, ...Array.from({ length: headers.length - row.length }, () => "")].slice(0, headers.length);
    });
    setBlock(idx, { ...block, headers, rows });
  };

  const updateCell = (rowIdx: number, cellIdx: number, value: string) => {
    const rows = block.rows.map((row, i) => (
      i === rowIdx ? row.map((cell, j) => (j === cellIdx ? value : cell)) : row
    ));
    setBlock(idx, { ...block, rows });
  };

  const addColumn = () => {
    if (block.headers.length >= 8) return;
    setBlock(idx, {
      ...block,
      headers: [...block.headers, ""],
      rows: block.rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = (columnIdx: number) => {
    if (block.headers.length <= 2) return;
    setBlock(idx, {
      ...block,
      headers: block.headers.filter((_, i) => i !== columnIdx),
      rows: block.rows.map((row) => row.filter((_, i) => i !== columnIdx)),
    });
  };

  const addRow = () => {
    if (block.rows.length >= 20) return;
    setBlock(idx, {
      ...block,
      rows: [...block.rows, Array.from({ length: block.headers.length }, () => "")],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (block.rows.length <= 1) return;
    setBlock(idx, { ...block, rows: block.rows.filter((_, i) => i !== rowIdx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addColumn}
          className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          + 열 추가
        </button>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          + 행 추가
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[420px] border-collapse bg-[var(--background)] text-sm">
          <thead className="bg-[var(--background)]">
            <tr>
              {block.headers.map((header, headerIdx) => (
                <th key={`header-${headerIdx}`} className="border-b border-[var(--border)] p-2 align-top">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => updateHeader(headerIdx, e.target.value)}
                      placeholder={`헤더 ${headerIdx + 1}`}
                      className={inputClass(hasError)}
                      aria-label={`테이블 헤더 ${headerIdx + 1}`}
                    />
                    {block.headers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(headerIdx)}
                        className="shrink-0 rounded px-2 py-2 text-xs text-red-500 hover:bg-red-50"
                        aria-label={`열 ${headerIdx + 1} 삭제`}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="border-t border-[var(--border)]">
                {row.map((cell, cellIdx) => (
                  <td key={`cell-${rowIdx}-${cellIdx}`} className="p-2 align-top">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={cell}
                        onChange={(e) => updateCell(rowIdx, cellIdx, e.target.value)}
                        rows={2}
                        placeholder={`행 ${rowIdx + 1}, 열 ${cellIdx + 1}`}
                        className={`${inputClass(hasError)} resize-y`}
                        aria-label={`테이블 행 ${rowIdx + 1}, 열 ${cellIdx + 1}`}
                      />
                      {cellIdx === row.length - 1 && block.rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          className="shrink-0 rounded px-2 py-2 text-xs text-red-500 hover:bg-red-50"
                          aria-label={`행 ${rowIdx + 1} 삭제`}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
