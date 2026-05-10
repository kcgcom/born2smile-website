"use client";

import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, EyeOff, Pencil, RotateCcw, Save, X, Plus, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";
import type { ResearchPage, ResearchPaper, KeyFinding } from "@/lib/research/types";

interface Props {
  page: ResearchPage;
  verified: boolean;
}

export function InlineResearchEditButton({ page, verified: initialVerified }: Props) {
  const isAdmin = useAdminAuth();
  const router = useRouter();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [metaCollapsed, setMetaCollapsed] = useState(false);
  const [papersCollapsed, setPapersCollapsed] = useState(true);
  const [verified, setVerified] = useState(initialVerified);
  const [verifying, setVerifying] = useState(false);

  // 편집 상태
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle);
  const [description, setDescription] = useState(page.description);
  const [papers, setPapers] = useState<ResearchPaper[]>(page.papers);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const sync = () => setToolbarHeight(Math.ceil(el.getBoundingClientRect().height));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => { ro.disconnect(); window.removeEventListener("resize", sync); };
  }, [isEditMode]);

  const handleReset = () => {
    setTitle(page.title);
    setSubtitle(page.subtitle);
    setDescription(page.description);
    setPapers(page.papers);
    setSaveError(null);
  };

  const handleExit = () => {
    handleReset();
    setIsEditMode(false);
  };

  const handleVerify = useCallback(async (nextVerified: boolean) => {
    setVerifying(true);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/research/${page.slug}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verified: nextVerified }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "저장에 실패했어요");
      }
      setVerified(nextVerified);
      setNotice(nextVerified ? "검증 완료 — 이 페이지가 공개됩니다." : "비공개 처리됐습니다.");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했어요");
    } finally {
      setVerifying(false);
    }
  }, [page.slug, router]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/research/${page.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...page,
          title,
          subtitle,
          description,
          papers,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? "저장에 실패했어요");
      }
      setNotice("저장 완료. 페이지를 새로고침합니다.");
      setIsEditMode(false);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  }, [page, title, subtitle, description, papers, router]);

  // paper 필드 업데이트 헬퍼
  const updatePaper = (idx: number, patch: Partial<ResearchPaper>) => {
    setPapers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const updateFinding = (pi: number, fi: number, patch: Partial<KeyFinding>) => {
    setPapers((prev) =>
      prev.map((p, i) =>
        i !== pi
          ? p
          : {
              ...p,
              keyFindings: p.keyFindings.map((f, j) =>
                j === fi ? { ...f, ...patch } : f,
              ),
            },
      ),
    );
  };

  const addFinding = (pi: number) => {
    setPapers((prev) =>
      prev.map((p, i) =>
        i !== pi
          ? p
          : { ...p, keyFindings: [...p.keyFindings, { stat: "", label: "" }] },
      ),
    );
  };

  const removeFinding = (pi: number, fi: number) => {
    setPapers((prev) =>
      prev.map((p, i) =>
        i !== pi
          ? p
          : { ...p, keyFindings: p.keyFindings.filter((_, j) => j !== fi) },
      ),
    );
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none";
  const textareaCls = `${inputCls} resize-y`;

  if (!isAdmin) return null;

  return (
    <>
      <AdminSurface
        tone="dark"
        className="fixed top-[76px] right-0 left-0 z-40"
        ref={toolbarRef}
      >
        <div className="px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <AdminPill tone="amber" className="shrink-0">관리자</AdminPill>
              <p className="hidden truncate text-sm font-medium text-slate-100 md:block">
                연구 자료 편집 도구
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* 검증 토글 — 항상 표시 */}
              {verified ? (
                <AdminActionButton
                  type="button"
                  onClick={() => handleVerify(false)}
                  disabled={verifying}
                  tone="ghost"
                  className="rounded-full bg-emerald-500/20 px-3 text-emerald-300 hover:bg-red-500/20 hover:text-red-300"
                >
                  <CheckCircle2 size={14} />
                  {verifying ? "처리 중..." : "공개 중"}
                </AdminActionButton>
              ) : (
                <AdminActionButton
                  type="button"
                  onClick={() => handleVerify(true)}
                  disabled={verifying}
                  tone="ghost"
                  className="rounded-full bg-amber-500/20 px-3 text-amber-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                >
                  <EyeOff size={14} />
                  {verifying ? "처리 중..." : "검증 완료"}
                </AdminActionButton>
              )}

              {isEditMode ? (
                <>
                  <AdminActionButton
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    tone="primary"
                    className="rounded-full px-4"
                  >
                    <Save size={14} />
                    {saving ? "저장 중..." : "저장"}
                  </AdminActionButton>
                  <AdminActionButton
                    type="button"
                    onClick={handleExit}
                    disabled={saving}
                    tone="ghost"
                    className="rounded-full bg-white/10 px-4 text-white hover:bg-white/15"
                  >
                    <X size={14} />
                    편집 종료
                  </AdminActionButton>
                </>
              ) : (
                <AdminActionButton
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  tone="primary"
                  className="rounded-full px-4"
                >
                  <Pencil size={14} />
                  편집 모드
                </AdminActionButton>
              )}
            </div>
          </div>
        </div>
      </AdminSurface>

      <div
        aria-hidden="true"
        className="h-[52px]"
        style={toolbarHeight ? { height: `${toolbarHeight}px` } : undefined}
      />

      {isEditMode && (
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* 안내 / 에러 */}
            {notice && (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                {notice}
              </p>
            )}
            {saveError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {saveError}
              </p>
            )}

            {/* 페이지 메타 */}
            <AdminSurface tone="white" className="rounded-2xl p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">페이지 메타</p>
                <div className="flex gap-2">
                  <AdminActionButton
                    type="button"
                    onClick={handleReset}
                    tone="dark"
                    className="px-3 py-1.5 text-xs"
                  >
                    <RotateCcw size={12} /> 되돌리기
                  </AdminActionButton>
                  <AdminActionButton
                    type="button"
                    onClick={() => setMetaCollapsed((v) => !v)}
                    tone="dark"
                    className="px-3 py-1.5 text-xs"
                  >
                    {metaCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    {metaCollapsed ? "펼치기" : "접기"}
                  </AdminActionButton>
                </div>
              </div>
              {!metaCollapsed && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">제목</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">부제</label>
                    <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">설명 (SEO meta description)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={textareaCls} />
                  </div>
                </div>
              )}
            </AdminSurface>

            {/* 논문 편집 */}
            <AdminSurface tone="white" className="rounded-2xl p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">논문 ({papers.length}편)</p>
                <AdminActionButton
                  type="button"
                  onClick={() => setPapersCollapsed((v) => !v)}
                  tone="dark"
                  className="px-3 py-1.5 text-xs"
                >
                  {papersCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  {papersCollapsed ? "펼치기" : "접기"}
                </AdminActionButton>
              </div>

              {!papersCollapsed && (
                <div className="space-y-6">
                  {papers.map((paper, pi) => (
                    <div key={paper.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">논문 {pi + 1}</p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">한국어 제목</label>
                          <input value={paper.titleKo} onChange={(e) => updatePaper(pi, { titleKo: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">저널</label>
                          <input value={paper.journal} onChange={(e) => updatePaper(pi, { journal: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">연도</label>
                          <input type="number" value={paper.year} onChange={(e) => updatePaper(pi, { year: Number(e.target.value) })} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">PubMed URL</label>
                          <input value={paper.pubmedUrl} onChange={(e) => updatePaper(pi, { pubmedUrl: e.target.value })} className={inputCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">연구 요약</label>
                          <textarea value={paper.summary} onChange={(e) => updatePaper(pi, { summary: e.target.value })} rows={3} className={textareaCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">임상적 시사점</label>
                          <textarea value={paper.clinicalNote ?? ""} onChange={(e) => updatePaper(pi, { clinicalNote: e.target.value })} rows={2} className={textareaCls} />
                        </div>
                      </div>

                      {/* 핵심 수치 */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500">핵심 수치</p>
                          <button
                            type="button"
                            onClick={() => addFinding(pi)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Plus size={12} /> 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {paper.keyFindings.map((f, fi) => (
                            <div key={fi} className="flex gap-2 items-start">
                              <input
                                value={f.stat}
                                onChange={(e) => updateFinding(pi, fi, { stat: e.target.value })}
                                placeholder="수치 (예: 94%)"
                                className={`${inputCls} w-24 shrink-0`}
                              />
                              <input
                                value={f.label}
                                onChange={(e) => updateFinding(pi, fi, { label: e.target.value })}
                                placeholder="설명"
                                className={inputCls}
                              />
                              <button
                                type="button"
                                onClick={() => removeFinding(pi, fi)}
                                className="shrink-0 mt-2 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSurface>
          </div>
        </div>
      )}
    </>
  );
}
