"use client";

import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Pencil,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useResearchEdit } from "@/components/admin/ResearchEditContext";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";
import type { ResearchPage } from "@/lib/research/types";

interface Props {
  page: ResearchPage;
  verified: boolean;
}

export function InlineResearchEditButton({ page, verified: initialVerified }: Props) {
  const isAdmin = useAdminAuth();
  const { isEditMode, setIsEditMode } = useResearchEdit();
  const router = useRouter();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [metaCollapsed, setMetaCollapsed] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [verifying, setVerifying] = useState(false);

  // 메타 편집 상태
  const [title, setTitle] = useState(page.title);
  const [subtitle, setSubtitle] = useState(page.subtitle);
  const [description, setDescription] = useState(page.description);
  const [hubSummary, setHubSummary] = useState(page.hubSummary ?? "");
  const [hubHighlightStat, setHubHighlightStat] = useState(page.hubHighlightStat ?? "");
  const [hubHighlightLabel, setHubHighlightLabel] = useState(page.hubHighlightLabel ?? "");
  const [hubHighlightContext, setHubHighlightContext] = useState(page.hubHighlightContext ?? "");

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const sync = () => setToolbarHeight(Math.ceil(el.getBoundingClientRect().height));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [isEditMode]);

  const handleReset = () => {
    setTitle(page.title);
    setSubtitle(page.subtitle);
    setDescription(page.description);
    setHubSummary(page.hubSummary ?? "");
    setHubHighlightStat(page.hubHighlightStat ?? "");
    setHubHighlightLabel(page.hubHighlightLabel ?? "");
    setHubHighlightContext(page.hubHighlightContext ?? "");
    setSaveError(null);
  };

  const handleExit = () => {
    handleReset();
    setIsEditMode(false);
  };

  const handleVerify = useCallback(
    async (nextVerified: boolean) => {
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
    },
    [page.slug, router],
  );

  const handleSaveMeta = useCallback(async () => {
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
            hubSummary: hubSummary.trim() || undefined,
            hubHighlightStat: hubHighlightStat.trim() || undefined,
            hubHighlightLabel: hubHighlightLabel.trim() || undefined,
            hubHighlightContext: hubHighlightContext.trim() || undefined,
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
  }, [page, title, subtitle, description, hubSummary, hubHighlightStat, hubHighlightLabel, hubHighlightContext, router, setIsEditMode]);

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
              {/* 검증 토글 */}
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

              {/* 편집 모드 토글 */}
              {isEditMode ? (
                <>
                  <AdminActionButton
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={saving}
                    tone="primary"
                    className="rounded-full px-4"
                  >
                    <Save size={14} />
                    {saving ? "저장 중..." : "메타 저장"}
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

      {/* 편집 모드: 페이지 메타만 표시 (논문은 각 카드에서 직접 편집) */}
      {isEditMode && (
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-6">
          <div className="mx-auto max-w-4xl space-y-4">
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
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">부제</label>
                    <input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">설명 (SEO meta description)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none resize-y"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">허브 카드 설명</label>
                    <textarea
                      value={hubSummary}
                      onChange={(e) => setHubSummary(e.target.value)}
                      rows={2}
                      placeholder="research 허브 목록 카드에 노출할 짧은 설명"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none resize-y"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">허브 하이라이트 수치</label>
                      <input
                        value={hubHighlightStat}
                        onChange={(e) => setHubHighlightStat(e.target.value)}
                        placeholder="예: 89%"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">허브 하이라이트 라벨</label>
                      <input
                        value={hubHighlightLabel}
                        onChange={(e) => setHubHighlightLabel(e.target.value)}
                        placeholder="예: 시술 후 1주 내 통증 없음"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">허브 하이라이트 보조 문구</label>
                    <textarea
                      value={hubHighlightContext}
                      onChange={(e) => setHubHighlightContext(e.target.value)}
                      rows={2}
                      placeholder="예: 통증은 대개 빠르게 줄어듭니다"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none resize-y"
                    />
                  </div>
                </div>
              )}
            </AdminSurface>

            <p className="text-xs text-slate-500 text-center">
              논문 내용은 각 카드 우측 상단의 <strong>편집</strong> 버튼으로 수정하세요.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
