"use client";

import type { BlogBlock, BlogCategorySlug } from "@/lib/blog/types";
import { inputClass } from "./shared";
import { ImageBlockEditor } from "./ImageBlockEditor";
import { TableBlockEditor } from "./TableBlockEditor";
import { RelatedLinkEditor } from "./RelatedLinkEditor";

interface BlockEditorRendererProps {
  block: BlogBlock;
  idx: number;
  setBlock: (idx: number, block: BlogBlock) => void;
  fieldErrors: Record<string, string>;
  uploadContext: { category: BlogCategorySlug; slug: string };
}

export function BlockEditorRenderer({
  block,
  idx,
  setBlock,
  fieldErrors,
  uploadContext,
}: BlockEditorRendererProps) {
  const hasError = !!fieldErrors[`block_${idx}`];

  switch (block.type) {
    case "heading":
      return (
        <>
          <select
            value={block.level}
            onChange={(e) => setBlock(idx, { ...block, level: Number(e.target.value) as 2 | 3 })}
            className={inputClass(false)}
            aria-label={`블록 ${idx + 1} 제목 수준`}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => setBlock(idx, { ...block, text: e.target.value })}
            placeholder="제목 텍스트"
            className={inputClass(hasError)}
            aria-label={`블록 ${idx + 1} 제목 텍스트`}
          />
        </>
      );
    case "paragraph":
      return (
        <textarea
          value={block.text}
          onChange={(e) => setBlock(idx, { ...block, text: e.target.value })}
          rows={5}
          placeholder="문단 텍스트"
          className={`${inputClass(hasError)} resize-y`}
          aria-label={`블록 ${idx + 1} 문단 텍스트`}
        />
      );
    case "list":
      return (
        <div className="space-y-2">
          <select
            value={block.style}
            onChange={(e) => setBlock(idx, { ...block, style: e.target.value as "bullet" | "number" })}
            className={inputClass(false)}
            aria-label={`블록 ${idx + 1} 리스트 스타일`}
          >
            <option value="bullet">불릿 리스트</option>
            <option value="number">번호 리스트</option>
          </select>
          {block.items.map((item, itemIdx) => (
            <div key={itemIdx} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const items = block.items.map((current, i) => (i === itemIdx ? e.target.value : current));
                  setBlock(idx, { ...block, items });
                }}
                placeholder={`목록 항목 ${itemIdx + 1}`}
                className={inputClass(hasError)}
                aria-label={`블록 ${idx + 1} 목록 항목 ${itemIdx + 1}`}
              />
              {block.items.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const items = block.items.filter((_, i) => i !== itemIdx);
                    setBlock(idx, { ...block, items });
                  }}
                  className="shrink-0 rounded px-2 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {block.items.length < 10 && (
            <button
              type="button"
              onClick={() => setBlock(idx, { ...block, items: [...block.items, ""] })}
              className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              + 목록 항목 추가
            </button>
          )}
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={block.question}
            onChange={(e) => setBlock(idx, { ...block, question: e.target.value })}
            placeholder="질문"
            className={inputClass(hasError)}
            aria-label={`블록 ${idx + 1} FAQ 질문`}
          />
          <textarea
            value={block.answer}
            onChange={(e) => setBlock(idx, { ...block, answer: e.target.value })}
            rows={4}
            placeholder="답변"
            className={`${inputClass(hasError)} resize-y`}
            aria-label={`블록 ${idx + 1} FAQ 답변`}
          />
        </div>
      );
    case "relatedLinks":
      return (
        <div className="space-y-3">
          {block.items.map((item, itemIdx) => (
            <RelatedLinkEditor
              key={itemIdx}
              item={item}
              canRemove={block.items.length > 1}
              onRemove={() => {
                const items = block.items.filter((_, i) => i !== itemIdx);
                setBlock(idx, { ...block, items });
              }}
              onChange={(nextItem) => {
                const items = block.items.map((current, i) => (i === itemIdx ? nextItem : current));
                setBlock(idx, { ...block, items });
              }}
            />
          ))}
          {block.items.length < 6 && (
            <button
              type="button"
              onClick={() =>
                setBlock(idx, {
                  ...block,
                  items: [...block.items, { title: "", href: "", description: "" }],
                })
              }
              className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              + 관련 링크 추가
            </button>
          )}
        </div>
      );
    case "image":
      return (
        <ImageBlockEditor
          block={block}
          idx={idx}
          setBlock={setBlock}
          hasError={hasError}
          uploadContext={uploadContext}
        />
      );
    case "table":
      return (
        <TableBlockEditor
          block={block}
          idx={idx}
          setBlock={setBlock}
          hasError={hasError}
        />
      );
    default:
      return null;
  }
}
