"use client";

import { FileQuestion, Sparkles, Wrench } from "lucide-react";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { BusinessValueBadge, CategoryBadge } from "./shared";
import type { FaqSuggestionItem, InsightActionItem, PageUpdateOpportunityItem } from "./shared";
import { ACTION_LABELS } from "./strategy-shared";

export function RecommendedActionsSection({
  insightActions,
  pageOpportunities,
  faqSuggestions,
}: {
  insightActions: InsightActionItem[];
  pageOpportunities: PageUpdateOpportunityItem[];
  faqSuggestions: FaqSuggestionItem[];
}) {
  const total = insightActions.length + pageOpportunities.length + faqSuggestions.length;
  if (total === 0) return null;

  return (
    <AdminDisclosureSection
      title="우선 실행안"
      description="우선순위 기준"
      countLabel={`${total}개`}
      defaultOpen={true}
      collapsedMessage="필요할 때만 펼쳐 봅니다."
      titleLevel="h2"
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">우선 실행 액션</h3>
          </div>
          <div className="space-y-3">
            {insightActions.slice(0, 5).map((item: InsightActionItem) => (
              <div key={`${item.slug}-${item.subGroup}-${item.actionType}`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={item.slug} />
                  <BusinessValueBadge value={item.businessValue} />
                  <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                    {ACTION_LABELS[item.actionType]}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.subGroup}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.reason}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--muted)]">신뢰도 {item.confidence}</span>
                  <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                    대상 페이지 열기
                  </a>
                </div>
              </div>
            ))}
            {insightActions.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">추천 액션이 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">서비스 페이지 보강</h3>
          </div>
          <div className="space-y-3">
            {pageOpportunities.slice(0, 5).map((item: PageUpdateOpportunityItem) => (
              <div key={`${item.slug}-${item.subGroup}`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={item.slug} />
                  <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700">
                    보강 {item.pageUpdateScore}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.subGroup}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  부족 섹션: {item.missingSections.join(" · ")}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  추천 블록: {item.recommendedBlocks.join(" · ")}
                </p>
                <div className="mt-2">
                  <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                    서비스 페이지 열기
                  </a>
                </div>
              </div>
            ))}
            {pageOpportunities.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">보강 후보가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">FAQ 추가 추천</h3>
          </div>
          <div className="space-y-3">
            {faqSuggestions.slice(0, 5).map((item: FaqSuggestionItem) => (
              <div key={`${item.slug}-${item.subGroup}-${item.question}`} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={item.slug} />
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    우선순위 {item.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.question}</p>
                {item.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.keywords.map((keyword) => (
                      <span key={keyword} className="rounded bg-[var(--background)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                    적용 페이지 열기
                  </a>
                </div>
              </div>
            ))}
            {faqSuggestions.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">FAQ 추천이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </AdminDisclosureSection>
  );
}
