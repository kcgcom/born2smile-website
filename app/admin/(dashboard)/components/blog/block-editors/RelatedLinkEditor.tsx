"use client";

import type { BlogRelatedLinkItem } from "@/lib/blog/types";
import { inputClass } from "./shared";

export function RelatedLinkEditor({
  item,
  canRemove,
  onRemove,
  onChange,
}: {
  item: BlogRelatedLinkItem;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (item: BlogRelatedLinkItem) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex justify-end">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        )}
      </div>
      <input
        type="text"
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        placeholder="링크 제목"
        className={inputClass(false)}
      />
      <input
        type="text"
        value={item.href}
        onChange={(e) => onChange({ ...item, href: e.target.value })}
        placeholder="/blog/health-tips/example"
        className={inputClass(false)}
      />
      <textarea
        value={item.description ?? ""}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        rows={2}
        placeholder="링크 설명 (선택)"
        className={`${inputClass(false)} resize-y`}
      />
    </div>
  );
}
