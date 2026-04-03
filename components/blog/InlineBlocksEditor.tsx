"use client";

import { Fragment, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getAccessToken } from "@/lib/supabase";
import type { BlogBlock, BlogCategorySlug } from "@/lib/blog";
import { renderSingleBlock, computeHeadingIds } from "./BlogPostRenderer";
import { useBlogEditContext } from "./BlogEditProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostMeta {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
}

// ─── Block type metadata ──────────────────────────────────────────────────────

const BLOCK_OPTIONS: { type: BlogBlock["type"]; label: string; desc: string }[] = [
  { type: "heading", label: "소제목", desc: "H2/H3" },
  { type: "paragraph", label: "문단", desc: "텍스트" },
  { type: "list", label: "목록", desc: "불릿/번호" },
  { type: "faq", label: "FAQ", desc: "Q&A" },
  { type: "relatedLinks", label: "관련 링크", desc: "링크 모음" },
  { type: "table", label: "표", desc: "비교/정리" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function InlineBlocksEditor({ post }: { post: PostMeta }) {
  const isAdmin = useAdminAuth();
  const router = useRouter();
  const { isEditMode, blocks, setBlocks } = useBlogEditContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Destructure scalars so useCallback deps don't invalidate on every parent render
  const { slug, title, subtitle, excerpt, category, tags, date } = post;
  // Ref-based guard prevents concurrent overlapping save calls
  const inflightRef = useRef(false);

  const saveToApi = useCallback(
    async (newBlocks: BlogBlock[]) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/admin/blog-posts/${slug}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug,
            title,
            subtitle,
            excerpt,
            category,
            tags,
            date,
            blocks: newBlocks,
            published: true,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({})) as { message?: string };
          throw new Error(json.message ?? "저장에 실패했어요");
        }
        setBlocks(newBlocks);
        setEditingIndex(null);
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "저장에 실패했어요");
      } finally {
        setSaving(false);
        inflightRef.current = false;
      }
    },
    [slug, title, subtitle, excerpt, category, tags, date, router, setBlocks],
  );

  const headingIds = computeHeadingIds(blocks);

  // Non-admin or not in edit mode: plain read view
  if (!isAdmin || !isEditMode) {
    return (
      <div className="space-y-10">
        {blocks.map((block, i) => (
          <Fragment key={i}>{renderSingleBlock(block, headingIds[i])}</Fragment>
        ))}
      </div>
    );
  }

  const handleSave = (index: number, updated: BlogBlock) =>
    saveToApi(blocks.map((b, i) => (i === index ? updated : b)));

  const handleDelete = (index: number) => {
    if (!confirm("이 블록을 삭제할까요?")) return;
    saveToApi(blocks.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, dir: "up" | "down") => {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= blocks.length) return;
    const nb = [...blocks];
    [nb[index], nb[target]] = [nb[target], nb[index]];
    saveToApi(nb);
  };

  const handleAddAfter = (afterIndex: number, newBlock: BlogBlock) => {
    const nb = [...blocks];
    nb.splice(afterIndex + 1, 0, newBlock);
    saveToApi(nb);
  };

  return (
    <div className="space-y-10">
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {blocks.map((block, index) => (
        <AdminBlockWrapper
          key={`${block.type}-${index}`}
          block={block}
          index={index}
          totalBlocks={blocks.length}
          headingId={headingIds[index]}
          isEditing={editingIndex === index}
          saving={saving}
          onStartEdit={() =>
            setEditingIndex(editingIndex === index ? null : index)
          }
          onCancelEdit={() => setEditingIndex(null)}
          onSave={(updated) => handleSave(index, updated)}
          onDelete={() => handleDelete(index)}
          onMoveUp={() => handleMove(index, "up")}
          onMoveDown={() => handleMove(index, "down")}
          onAddAfter={(nb) => handleAddAfter(index, nb)}
        />
      ))}

      <div className="flex justify-center pt-2">
        <AddBlockButton
          onAdd={(nb) => saveToApi([...blocks, nb])}
          saving={saving}
        />
      </div>
    </div>
  );
}

// ─── AdminBlockWrapper ────────────────────────────────────────────────────────

interface AdminBlockWrapperProps {
  block: BlogBlock;
  index: number;
  totalBlocks: number;
  headingId?: string;
  isEditing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updated: BlogBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: (newBlock: BlogBlock) => void;
}

function AdminBlockWrapper({
  block,
  index,
  totalBlocks,
  headingId,
  isEditing,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAfter,
}: AdminBlockWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowAddMenu(false);
      }}
    >
      {/* Admin toolbar */}
      {(hovered || isEditing) && (
        <div className="absolute -top-3 right-0 z-20 flex items-center gap-1">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-white shadow hover:bg-gray-700 disabled:opacity-50"
              >
                <Pencil size={10} />
                수정
              </button>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0 || saving}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30"
                title="위로 이동"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === totalBlocks - 1 || saving}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow hover:bg-gray-100 disabled:opacity-30"
                title="아래로 이동"
              >
                <ChevronDown size={12} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu((v) => !v)}
                  disabled={saving}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 shadow hover:bg-gray-100"
                  title="아래에 블록 추가"
                >
                  <Plus size={12} />
                </button>
                {showAddMenu && (
                  <BlockTypeMenu
                    onSelect={(nb) => {
                      setShowAddMenu(false);
                      onAddAfter(nb);
                    }}
                    className="absolute right-0 top-full mt-1"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 shadow hover:bg-red-100"
                title="삭제"
              >
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Block content */}
      <div
        className={`rounded-xl transition-all ${
          isEditing
            ? "ring-2 ring-blue-400 ring-offset-2"
            : hovered
              ? "ring-1 ring-gray-200 ring-offset-1"
              : ""
        }`}
      >
        {isEditing ? (
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
              {BLOCK_OPTIONS.find((o) => o.type === block.type)?.label} 수정
            </p>
            <BlockEditForm
              block={block}
              saving={saving}
              onSave={onSave}
              onCancel={onCancelEdit}
            />
          </div>
        ) : (
          <div
            onClick={onStartEdit}
            className={hovered ? "cursor-pointer" : ""}
          >
            {renderSingleBlock(block, headingId)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BlockEditForm dispatcher ─────────────────────────────────────────────────

interface BlockFormProps {
  block: BlogBlock;
  saving: boolean;
  onSave: (updated: BlogBlock) => void;
  onCancel: () => void;
}

function BlockEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  switch (block.type) {
    case "heading":
      return <HeadingEditForm block={block} saving={saving} onSave={onSave} onCancel={onCancel} />;
    case "paragraph":
      return <ParagraphEditForm block={block} saving={saving} onSave={onSave} onCancel={onCancel} />;
    case "list":
      return <ListEditForm block={block} saving={saving} onSave={onSave} onCancel={onCancel} />;
    case "faq":
      return <FaqEditForm block={block} saving={saving} onSave={onSave} onCancel={onCancel} />;
    case "relatedLinks":
      return <RelatedLinksEditForm block={block} saving={saving} onSave={onSave} onCancel={onCancel} />;
    default:
      return null;
  }
}

function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Check size={14} />
        {saving ? "저장 중..." : "저장"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
      >
        <X size={14} />
        취소
      </button>
    </div>
  );
}

// ─── Edit forms ───────────────────────────────────────────────────────────────

function HeadingEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  const b = block as Extract<BlogBlock, { type: "heading" }>;
  const [text, setText] = useState(b.text);
  const [level, setLevel] = useState<2 | 3>(b.level);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave({ type: "heading", level, text: text.trim() });
      }}
    >
      <div className="mb-3 flex gap-4">
        {([2, 3] as const).map((lv) => (
          <label key={lv} className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="radio"
              name="heading-level"
              checked={level === lv}
              onChange={() => setLevel(lv)}
            />
            {lv === 2 ? "H2 (대제목)" : "H3 (소제목)"}
          </label>
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base font-bold focus:border-blue-400 focus:outline-none"
        placeholder="소제목 텍스트"
        autoFocus
      />
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function ParagraphEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  const b = block as Extract<BlogBlock, { type: "paragraph" }>;
  const [text, setText] = useState(b.text);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave({ type: "paragraph", text: text.trim() });
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-base leading-relaxed focus:border-blue-400 focus:outline-none"
        placeholder="문단 내용"
        autoFocus
      />
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function ListEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  const b = block as Extract<BlogBlock, { type: "list" }>;
  const [style, setStyle] = useState<"bullet" | "number">(b.style);
  const [items, setItems] = useState<string[]>([...b.items]);

  const updateItem = (idx: number, val: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? val : it)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const valid = items.map((it) => it.trim()).filter(Boolean);
        if (!valid.length) return;
        onSave({ type: "list", style, items: valid });
      }}
    >
      <div className="mb-3 flex gap-4">
        {(["bullet", "number"] as const).map((s) => (
          <label key={s} className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="radio"
              name="list-style"
              checked={style === s}
              onChange={() => setStyle(s)}
            />
            {s === "bullet" ? "불릿 목록" : "번호 목록"}
          </label>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-sm text-gray-400">
              {style === "number" ? `${idx + 1}.` : "•"}
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              placeholder={`항목 ${idx + 1}`}
              autoFocus={idx === 0}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, ""])}
        className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus size={13} />
        항목 추가
      </button>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function FaqEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  const b = block as Extract<BlogBlock, { type: "faq" }>;
  const [question, setQuestion] = useState(b.question);
  const [answer, setAnswer] = useState(b.answer);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!question.trim() || !answer.trim()) return;
        onSave({ type: "faq", question: question.trim(), answer: answer.trim() });
      }}
    >
      <label className="mb-1 block text-sm font-medium text-gray-600">질문</label>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold focus:border-blue-400 focus:outline-none"
        placeholder="질문을 입력하세요"
        autoFocus
      />
      <label className="mb-1 block text-sm font-medium text-gray-600">답변</label>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:border-blue-400 focus:outline-none"
        placeholder="답변을 입력하세요"
      />
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

function RelatedLinksEditForm({ block, saving, onSave, onCancel }: BlockFormProps) {
  const b = block as Extract<BlogBlock, { type: "relatedLinks" }>;
  const [items, setItems] = useState(
    b.items.map((it) => ({ ...it, description: it.description ?? "" })),
  );

  const updateField = (idx: number, field: "title" | "href" | "description", val: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const valid = items
          .filter((it) => it.title.trim() && it.href.trim())
          .map(({ title, href, description }) => ({
            title: title.trim(),
            href: href.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
          }));
        if (!valid.length) return;
        onSave({ type: "relatedLinks", items: valid });
      }}
    >
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">링크 {idx + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              )}
            </div>
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateField(idx, "title", e.target.value)}
              className="mb-2 w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="링크 제목"
            />
            <input
              type="text"
              value={item.href}
              onChange={(e) => updateField(idx, "href", e.target.value)}
              className="mb-2 w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-sm text-gray-600 focus:border-blue-400 focus:outline-none"
              placeholder="/blog/category/slug 또는 https://..."
            />
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateField(idx, "description", e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              placeholder="설명 (선택)"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setItems((prev) => [...prev, { title: "", href: "", description: "" }])
        }
        className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus size={13} />
        링크 추가
      </button>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

// ─── BlockTypeMenu ────────────────────────────────────────────────────────────

function makeDefaultBlock(type: BlogBlock["type"]): BlogBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "새 소제목" };
    case "paragraph":
      return { type: "paragraph", text: "새 문단 내용을 입력하세요." };
    case "list":
      return { type: "list", style: "bullet", items: ["항목 1", "항목 2"] };
    case "faq":
      return { type: "faq", question: "자주 묻는 질문을 입력하세요", answer: "답변을 입력하세요" };
    case "relatedLinks":
      return { type: "relatedLinks", items: [{ title: "관련 링크", href: "/" }] };
    case "table":
      return { type: "table", headers: ["항목", "내용"], rows: [["예시", "내용을 입력하세요"]] };
  }
}

function BlockTypeMenu({
  onSelect,
  className = "",
}: {
  onSelect: (block: BlogBlock) => void;
  className?: string;
}) {
  return (
    <div className={`z-30 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${className}`}>
      {BLOCK_OPTIONS.map(({ type, label, desc }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(makeDefaultBlock(type))}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className="text-xs text-gray-400">{desc}</span>
        </button>
      ))}
    </div>
  );
}

// ─── AddBlockButton (bottom of post) ─────────────────────────────────────────

function AddBlockButton({ onAdd, saving }: { onAdd: (block: BlogBlock) => void; saving: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50"
      >
        <Plus size={14} />
        블록 추가
      </button>
      {open && (
        <BlockTypeMenu
          onSelect={(nb) => {
            setOpen(false);
            onAdd(nb);
          }}
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2"
        />
      )}
    </div>
  );
}
