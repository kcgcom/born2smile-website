"use client";

import { useState } from "react";
import { ChevronRight, NotebookPen, Wrench } from "lucide-react";
import { isBlogCategorySlug } from "@/lib/blog";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { CategoryBadge } from "./shared";
import type { BlogBriefItem, PageBriefItem } from "./shared";

const SLICE = 4;

export function BriefsSection({
  blogBriefs,
  pageBriefs,
  onStartBriefDraft,
  onOpenPageBriefWorkspace,
}: {
  blogBriefs: BlogBriefItem[];
  pageBriefs: PageBriefItem[];
  onStartBriefDraft: (brief: BlogBriefItem) => void;
  onOpenPageBriefWorkspace: (brief: PageBriefItem) => void;
}) {
  const [showAllBlog, setShowAllBlog] = useState(false);
  const [showAllPage, setShowAllPage] = useState(false);

  if (blogBriefs.length === 0 && pageBriefs.length === 0) return null;

  const visibleBlog = showAllBlog ? blogBriefs : blogBriefs.slice(0, SLICE);
  const visiblePage = showAllPage ? pageBriefs : pageBriefs.slice(0, SLICE);

  return (
    <AdminDisclosureSection
      title="실행 브리프"
      description="실행 초안"
      countLabel={`${blogBriefs.length + pageBriefs.length}개`}
      defaultOpen={true}
      collapsedMessage="필요할 때만 펼쳐 봅니다."
      titleLevel="h2"
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">블로그 초안 브리프</h3>
          </div>
          <div className="space-y-3">
            {visibleBlog.map((item: BlogBriefItem) => (
              <div key={`${item.slug}-${item.subGroup}-brief`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={item.slug} />
                  <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                    {item.targetReader}
                  </span>
                  </div>
                  {item.searchIntent && <span className="text-[11px] text-[var(--muted)]">{item.searchIntent}</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.suggestedTitle}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">타깃 키워드: {item.targetKeyword}</p>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                  {item.outline.slice(0, 3).map((outline) => (
                    <li key={outline}>• {outline}</li>
                  ))}
                </ul>
                {item.outline.length > 3 && (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">외 {item.outline.length - 3}개 섹션</p>
                )}
                <p className="mt-2 text-xs text-[var(--muted)]">메타 초안: {item.metaDescription}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                <div className="mt-3 flex justify-end">
                  {isBlogCategorySlug(item.slug) ? (
                    <AdminActionButton
                      type="button"
                      tone="primary"
                      onClick={() => onStartBriefDraft(item)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      브리프로 작성 시작
                      <ChevronRight className="h-3.5 w-3.5" />
                    </AdminActionButton>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">블로그 카테고리 아님</span>
                  )}
                </div>
              </div>
            ))}
            {blogBriefs.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">생성된 블로그 브리프가 없습니다.</p>
            )}
            {blogBriefs.length > SLICE && (
              <button
                onClick={() => setShowAllBlog((v) => !v)}
                className="mt-1 w-full text-center text-xs text-[var(--color-primary)] hover:underline"
              >
                {showAllBlog ? "접기" : `더 보기 (${blogBriefs.length - SLICE}건)`}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">페이지 보강 브리프</h3>
          </div>
          <div className="space-y-3">
            {visiblePage.map((item: PageBriefItem) => (
              <div key={`${item.slug}-${item.subGroup}-page-brief`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={item.slug} />
                  <a
                    href={item.targetPage}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                  >
                    대상 페이지 열기
                  </a>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.subGroup}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">히어로 카피: {item.heroCopy}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">보조 카피: {item.supportingCopy}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.blocks.slice(0, 2).map((block) => (
                    <span key={block} className="rounded bg-[var(--background)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{block}</span>
                  ))}
                </div>
                {item.blocks.length > 2 && (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">추천 블록 {item.blocks.length}개</p>
                )}
                <p className="mt-2 text-xs text-[var(--muted)]">
                  수정 파일: {item.sourceFiles.join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--background)] px-2 py-0.5">체크리스트 {item.checklist.length}개</span>
                  <span className="rounded-full bg-[var(--background)] px-2 py-0.5">FAQ {item.faqQuestions.length}개</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                <div className="mt-3 flex justify-end">
                  <AdminActionButton
                    type="button"
                    tone="dark"
                    onClick={() => onOpenPageBriefWorkspace(item)}
                    className="min-h-8 px-3 py-1 text-xs"
                  >
                    보강 워크노트 열기
                    <ChevronRight className="h-3.5 w-3.5" />
                  </AdminActionButton>
                </div>
              </div>
            ))}
            {pageBriefs.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">생성된 페이지 브리프가 없습니다.</p>
            )}
            {pageBriefs.length > SLICE && (
              <button
                onClick={() => setShowAllPage((v) => !v)}
                className="mt-1 w-full text-center text-xs text-[var(--color-primary)] hover:underline"
              >
                {showAllPage ? "접기" : `더 보기 (${pageBriefs.length - SLICE}건)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminDisclosureSection>
  );
}
