"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useResearchEdit } from "@/components/admin/ResearchEditContext";
import { getAccessToken } from "@/lib/supabase";
import type { ResearchPage, ResearchPaper, KeyFinding } from "@/lib/research/types";

interface Props {
  page: ResearchPage;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none";
const textareaCls = `${inputCls} resize-y`;

export function ResearchPapersView({ page }: Props) {
  const isAdmin = useAdminAuth();
  const { isEditMode } = useResearchEdit();
  const router = useRouter();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ResearchPaper | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setDraft(structuredClone(page.papers[index]));
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft(null);
    setSaveError(null);
  };

  const patchDraft = (patch: Partial<ResearchPaper>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const patchFinding = (fi: number, patch: Partial<KeyFinding>) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            keyFindings: prev.keyFindings.map((f, i) =>
              i === fi ? { ...f, ...patch } : f,
            ),
          }
        : prev,
    );

  const addFinding = () =>
    setDraft((prev) =>
      prev
        ? { ...prev, keyFindings: [...prev.keyFindings, { stat: "", label: "" }] }
        : prev,
    );

  const removeFinding = (fi: number) =>
    setDraft((prev) =>
      prev
        ? { ...prev, keyFindings: prev.keyFindings.filter((_, i) => i !== fi) }
        : prev,
    );

  const reorderPapers = useCallback(async (from: number, to: number) => {
    if (to < 0 || to >= page.papers.length || from === to) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updatedPapers = [...page.papers];
      const [moved] = updatedPapers.splice(from, 1);
      updatedPapers.splice(to, 0, moved);
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/research/${page.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...page, papers: updatedPapers }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "순서 저장에 실패했어요");
      }
      setEditingIndex(null);
      setDraft(null);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "순서 저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  }, [page, router]);

  const deletePaper = useCallback(async (index: number) => {
    if (!window.confirm("이 논문을 연구 요약에서 삭제할까요?")) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updatedPapers = page.papers.filter((_, i) => i !== index);
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/research/${page.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...page, papers: updatedPapers }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "논문 삭제에 실패했어요");
      }
      setEditingIndex(null);
      setDraft(null);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "논문 삭제에 실패했어요");
    } finally {
      setSaving(false);
    }
  }, [page, router]);

  const savePaper = useCallback(async () => {
    if (editingIndex === null || !draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updatedPapers = page.papers.map((p, i) =>
        i === editingIndex ? draft : p,
      );
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/research/${page.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...page, papers: updatedPapers }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "저장에 실패했어요");
      }
      setEditingIndex(null);
      setDraft(null);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  }, [editingIndex, draft, page, router]);

  return (
    <div className="space-y-16">
      {page.papers.map((paper, index) => {
        const isEditing = isEditMode && editingIndex === index;
        const currentPaper = isEditing && draft ? draft : paper;

        return (
          <article key={paper.id} className="border border-gray-200 rounded-2xl overflow-hidden">

            {/* 논문 헤더 */}
            <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isEditing ? (
                      <input
                        value={draft!.journal}
                        onChange={(e) => patchDraft({ journal: e.target.value })}
                        placeholder="저널명"
                        className={`${inputCls} max-w-[180px]`}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {currentPaper.journal}
                      </span>
                    )}
                    {isEditing ? (
                      <input
                        type="number"
                        value={draft!.year}
                        onChange={(e) => patchDraft({ year: Number(e.target.value) })}
                        className={`${inputCls} w-20`}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">{currentPaper.year}</span>
                    )}
                    {!isEditing && currentPaper.sampleSize && (
                      <span className="text-xs text-gray-400">· {currentPaper.sampleSize}</span>
                    )}
                    {!isEditing && currentPaper.followUpPeriod && (
                      <span className="text-xs text-gray-400">· 추적 {currentPaper.followUpPeriod}</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={draft!.title}
                        onChange={(e) => patchDraft({ title: e.target.value })}
                        placeholder="원문 제목 (영문)"
                        className={inputCls}
                      />
                      <input
                        value={draft!.titleKo}
                        onChange={(e) => patchDraft({ titleKo: e.target.value })}
                        placeholder="한국어 제목"
                        className={inputCls}
                      />
                      <input
                        value={draft!.pubmedUrl}
                        onChange={(e) => patchDraft({ pubmedUrl: e.target.value })}
                        placeholder="PubMed URL"
                        className={inputCls}
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 font-mono leading-relaxed">
                        {currentPaper.title}
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-gray-900 leading-snug">
                        {currentPaper.titleKo}
                      </h2>
                    </>
                  )}
                </div>

                {/* 우측: 번호 또는 편집 버튼 */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-gray-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {isAdmin && isEditMode && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => reorderPapers(index, index - 1)}
                        disabled={saving || index === 0}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        title="위로 이동"
                      >
                        <ChevronUp size={12} />
                        위로
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderPapers(index, index + 1)}
                        disabled={saving || index === page.papers.length - 1}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        title="아래로 이동"
                      >
                        <ChevronDown size={12} />
                        아래로
                      </button>
                    </div>
                  )}
                  {isAdmin && isEditMode && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(index)}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="이 논문 편집"
                      >
                        <Pencil size={12} />
                        편집
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePaper(index)}
                        disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title="이 논문 삭제"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>
                  )}
                  {isEditing && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={savePaper}
                        disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Save size={12} />
                        {saving ? "저장 중..." : "저장"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition-colors"
                      >
                        <X size={12} />
                        취소
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditing && saveError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                  {saveError}
                </p>
              )}
            </div>

            {/* 핵심 수치 */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  핵심 수치
                </p>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addFinding}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={12} /> 추가
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  {draft!.keyFindings.map((f, fi) => (
                    <div key={fi} className="flex gap-2 items-start">
                      <input
                        value={f.stat}
                        onChange={(e) => patchFinding(fi, { stat: e.target.value })}
                        placeholder="수치 (예: 94%)"
                        className={`${inputCls} w-28 shrink-0`}
                      />
                      <input
                        value={f.label}
                        onChange={(e) => patchFinding(fi, { label: e.target.value })}
                        placeholder="설명"
                        className={inputCls}
                      />
                      <input
                        value={f.context ?? ""}
                        onChange={(e) => patchFinding(fi, { context: e.target.value })}
                        placeholder="맥락 (선택)"
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeFinding(fi)}
                        className="shrink-0 mt-2 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentPaper.keyFindings.map((finding, i) => (
                    <div key={i} className="bg-blue-50 rounded-xl px-5 py-4">
                      <p className="text-3xl font-bold text-blue-700 leading-none">
                        {finding.stat}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-gray-800">
                        {finding.label}
                      </p>
                      {finding.context && (
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                          {finding.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 요약 */}
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                연구 요약
              </p>
              {isEditing ? (
                <textarea
                  value={draft!.summary}
                  onChange={(e) => patchDraft({ summary: e.target.value })}
                  rows={4}
                  className={textareaCls}
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentPaper.summary}
                </p>
              )}
            </div>

            {/* 임상적 시사점 */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  임상적 시사점
                </p>
                {isEditing ? (
                  <textarea
                    value={draft!.clinicalNote ?? ""}
                    onChange={(e) => patchDraft({ clinicalNote: e.target.value })}
                    rows={2}
                    placeholder="임상적 시사점 (선택)"
                    className={textareaCls}
                  />
                ) : (
                  currentPaper.clinicalNote && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {currentPaper.clinicalNote}
                    </p>
                  )
                )}
              </div>
            </div>

            {/* 원문 링크 */}
            <div className="px-6 py-4">
              <a
                href={currentPaper.pubmedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                <BookOpen className="h-4 w-4" />
                원문 보기 (PubMed)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
