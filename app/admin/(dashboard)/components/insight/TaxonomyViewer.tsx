"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getKeywordCategoryLabel, type CategoryKeywords } from "@/lib/admin-naver-datalab-keywords";

interface TaxonomyViewerProps {
  /** 보여줄 택소노미 */
  taxonomy: CategoryKeywords[];
  /** 비교 기준 택소노미 (diff 하이라이트용, 없으면 diff 없이 표시) */
  baseTaxonomy?: CategoryKeywords[];
  /** 헤더 제목 */
  title?: string;
}

interface CategoryDiff {
  addedKeywords: Set<string>;
  removedKeywords: Set<string>;
  addedSubgroups: Set<string>;
  removedSubgroups: Set<string>;
}

function computeCategoryDiff(
  category: CategoryKeywords,
  baseCategory: CategoryKeywords | undefined,
): CategoryDiff {
  const result: CategoryDiff = {
    addedKeywords: new Set(),
    removedKeywords: new Set(),
    addedSubgroups: new Set(),
    removedSubgroups: new Set(),
  };
  if (!baseCategory) {
    for (const sg of category.subGroups) {
      result.addedSubgroups.add(sg.name);
      for (const kw of sg.keywords) result.addedKeywords.add(`${sg.name}::${kw}`);
    }
    return result;
  }

  const baseGroupMap = new Map(baseCategory.subGroups.map((g) => [g.name, g]));
  const currentGroupNames = new Set(category.subGroups.map((g) => g.name));

  for (const sg of category.subGroups) {
    const baseGroup = baseGroupMap.get(sg.name);
    if (!baseGroup) {
      result.addedSubgroups.add(sg.name);
      for (const kw of sg.keywords) result.addedKeywords.add(`${sg.name}::${kw}`);
    } else {
      const baseKws = new Set(baseGroup.keywords);
      for (const kw of sg.keywords) {
        if (!baseKws.has(kw)) result.addedKeywords.add(`${sg.name}::${kw}`);
      }
      const currentKws = new Set(sg.keywords);
      for (const kw of baseGroup.keywords) {
        if (!currentKws.has(kw)) result.removedKeywords.add(`${sg.name}::${kw}`);
      }
    }
  }
  for (const bg of baseCategory.subGroups) {
    if (!currentGroupNames.has(bg.name)) {
      result.removedSubgroups.add(bg.name);
      for (const kw of bg.keywords) result.removedKeywords.add(`${bg.name}::${kw}`);
    }
  }
  return result;
}

export function TaxonomyViewer({ taxonomy, baseTaxonomy, title }: TaxonomyViewerProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set());
  const hasDiff = !!baseTaxonomy;

  const baseMap = useMemo(
    () => baseTaxonomy ? new Map(baseTaxonomy.map((c) => [c.slug, c])) : null,
    [baseTaxonomy],
  );

  const diffs = useMemo(() => {
    if (!baseMap) return new Map<string, CategoryDiff>();
    return new Map(taxonomy.map((c) => [c.slug, computeCategoryDiff(c, baseMap.get(c.slug))]));
  }, [taxonomy, baseMap]);

  const totalStats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const d of diffs.values()) {
      added += d.addedKeywords.size;
      removed += d.removedKeywords.size;
    }
    return { added, removed };
  }, [diffs]);

  const toggle = (slug: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const totalKeywords = taxonomy.reduce(
    (sum, c) => sum + c.subGroups.reduce((s, g) => s + g.keywords.length, 0), 0,
  );

  return (
    <AdminSurface tone="white" className="rounded-2xl p-5">
      {title && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
          <span className="text-xs text-[var(--muted)]">
            카테고리 {taxonomy.length}개 · 키워드 {totalKeywords}개
          </span>
          {hasDiff && totalStats.added > 0 && (
            <AdminPill tone="sky">+{totalStats.added} 추가</AdminPill>
          )}
          {hasDiff && totalStats.removed > 0 && (
            <AdminPill tone="warning">-{totalStats.removed} 삭제</AdminPill>
          )}
        </div>
      )}

      <div className="space-y-1">
        {taxonomy.map((category) => {
          const isOpen = openCategories.has(category.slug);
          const diff = diffs.get(category.slug);
          const changeCount = diff ? diff.addedKeywords.size + diff.removedKeywords.size + diff.addedSubgroups.size + diff.removedSubgroups.size : 0;

          return (
            <div key={category.slug}>
              <button
                type="button"
                onClick={() => toggle(category.slug)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--background)]"
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />}
                <span className="font-bold text-[var(--foreground)]">
                  {getKeywordCategoryLabel(category.slug)}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {category.subGroups.length}개 그룹 · {category.subGroups.reduce((s, g) => s + g.keywords.length, 0)}개 키워드
                </span>
                {hasDiff && changeCount > 0 && (
                  <AdminPill tone="sky">{changeCount}건 변경</AdminPill>
                )}
              </button>

              {isOpen && (
                <div className="ml-6 space-y-3 pb-3 pt-1">
                  {category.subGroups.map((group) => {
                    const isNewGroup = diff?.addedSubgroups.has(group.name);
                    return (
                      <div key={group.name} className="rounded-lg bg-[var(--background)] p-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isNewGroup ? "text-emerald-700" : "text-[var(--foreground)]"}`}>
                            {group.name}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">
                            {group.searchIntent === "informational" ? "정보형" :
                             group.searchIntent === "commercial" ? "비교/검토" :
                             group.searchIntent === "transactional" ? "전환형" : "탐색형"}
                          </span>
                          {isNewGroup && <AdminPill tone="sky">새 그룹</AdminPill>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.keywords.map((kw) => {
                            const isAdded = diff?.addedKeywords.has(`${group.name}::${kw}`);
                            return (
                              <span
                                key={kw}
                                className={`rounded-md px-2 py-0.5 text-xs ${
                                  isAdded
                                    ? "bg-emerald-100 font-medium text-emerald-800"
                                    : "bg-white text-[var(--foreground)]"
                                }`}
                              >
                                {kw}
                              </span>
                            );
                          })}
                          {/* 삭제된 키워드 표시 */}
                          {diff && [...diff.removedKeywords]
                            .filter((key) => key.startsWith(`${group.name}::`))
                            .map((key) => {
                              const kw = key.split("::")[1];
                              return (
                                <span
                                  key={`removed-${kw}`}
                                  className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 line-through"
                                >
                                  {kw}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                  {/* 삭제된 서브그룹 표시 */}
                  {diff && [...diff.removedSubgroups].map((name) => {
                    const baseCategory = baseMap?.get(category.slug);
                    const removedGroup = baseCategory?.subGroups.find((g) => g.name === name);
                    return (
                      <div key={`removed-${name}`} className="rounded-lg bg-red-50 p-3 opacity-60">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-800 line-through">{name}</span>
                          <AdminPill tone="warning">삭제됨</AdminPill>
                        </div>
                        {removedGroup && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {removedGroup.keywords.map((kw) => (
                              <span key={kw} className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-800 line-through">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminSurface>
  );
}
