"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Hash,
  Layers,
  Search,
  Tag,
} from "lucide-react";
import {
  CATEGORY_KEYWORDS,
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
  type CategoryKeywords,
  type KeywordSubGroup,
} from "@/lib/admin-naver-datalab-keywords";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: "정보",
  commercial: "상업",
  transactional: "거래",
  navigational: "탐색",
};

const INTENT_COLORS: Record<SearchIntent, string> = {
  informational: "bg-blue-100 text-blue-700",
  commercial: "bg-amber-100 text-amber-700",
  transactional: "bg-green-100 text-green-700",
  navigational: "bg-purple-100 text-purple-700",
};

const INTENT_BAR_COLORS: Record<SearchIntent, string> = {
  informational: "bg-blue-400",
  commercial: "bg-amber-400",
  transactional: "bg-green-400",
  navigational: "bg-purple-400",
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function getIntentDistribution(cat: CategoryKeywords) {
  const counts: Record<SearchIntent, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };
  for (const sg of cat.subGroups) {
    counts[sg.searchIntent] += 1;
  }
  return counts;
}

// ---------------------------------------------------------------
// Intent distribution mini bar
// ---------------------------------------------------------------

function IntentBar({ cat }: { cat: CategoryKeywords }) {
  const dist = getIntentDistribution(cat);
  const total = cat.subGroups.length;
  if (total === 0) return null;

  const segments = (
    Object.entries(dist) as [SearchIntent, number][]
  ).filter(([, v]) => v > 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        {segments.map(([intent, count]) => (
          <div
            key={intent}
            className={`${INTENT_BAR_COLORS[intent]} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {segments.map(([intent, count]) => (
          <span
            key={intent}
            className={`rounded px-1 py-0.5 text-[10px] font-medium ${INTENT_COLORS[intent]}`}
          >
            {INTENT_LABELS[intent]} {count}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Category overview card (grid view)
// ---------------------------------------------------------------

function CategoryCard({
  cat,
  isSelected,
  onClick,
}: {
  cat: CategoryKeywords;
  isSelected: boolean;
  onClick: () => void;
}) {
  const totalKw = cat.subGroups.reduce((s, g) => s + g.keywords.length, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {getKeywordCategoryLabel(cat.slug)}
      </h3>
      <p className="mt-0.5 text-xs text-gray-400">{cat.slug}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Layers size={12} />
          {cat.subGroups.length}개 그룹
        </span>
        <span className="flex items-center gap-1">
          <Tag size={12} />
          {totalKw}개
        </span>
      </div>

      <div className="mt-3">
        <IntentBar cat={cat} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------
// Category detail panel (drill-down)
// ---------------------------------------------------------------

function CategoryDetail({
  cat,
  onBack,
  filter,
}: {
  cat: CategoryKeywords;
  onBack: () => void;
  filter: string;
}) {
  const totalKw = cat.subGroups.reduce((s, g) => s + g.keywords.length, 0);

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return cat.subGroups;
    const q = filter.trim().toLowerCase();
    return cat.subGroups.filter(
      (sg) =>
        sg.name.toLowerCase().includes(q) ||
        sg.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [cat.subGroups, filter]);

  return (
    <section className="space-y-4">
      {/* Detail header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          전체
        </button>
        <div className="flex-1">
          <h3 className="text-base font-bold">
            {getKeywordCategoryLabel(cat.slug)}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {cat.slug}
            </span>
          </h3>
          <p className="text-xs text-gray-500">
            {cat.subGroups.length}개 서브그룹 · {totalKw}개 키워드
          </p>
        </div>
      </div>

      {/* SubGroup table */}
      {filteredGroups.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          &ldquo;{filter}&rdquo; 검색 결과가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((sg) => (
            <SubGroupPanel key={sg.name} sg={sg} filter={filter} />
          ))}
        </div>
      )}

      {/* Topic angles */}
      {cat.topicAngles.length > 0 && !filter && (
        <details className="rounded-xl border border-gray-200 bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-800">
            토픽 앵글 ({cat.topicAngles.length}개)
          </summary>
          <div className="border-t border-gray-100 px-5 py-3 space-y-1.5">
            {cat.topicAngles.map((ta) => (
              <div
                key={ta.template}
                className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600"
              >
                <span className="font-medium">{ta.template}</span>
                <span className="ml-2 text-gray-400">
                  → {ta.subGroup} · {ta.aspect}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// SubGroup panel (flat keyword view)
// ---------------------------------------------------------------

function SubGroupPanel({
  sg,
  filter,
}: {
  sg: KeywordSubGroup;
  filter: string;
}) {
  const q = filter.trim().toLowerCase();

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* SubGroup header */}
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="flex-1 text-sm font-semibold">{sg.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_COLORS[sg.searchIntent]}`}
        >
          {INTENT_LABELS[sg.searchIntent]}
        </span>
        <span className="text-xs text-gray-400">{sg.keywords.length}개</span>
      </div>

      {/* Keywords */}
      <div className="border-t border-gray-100 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {sg.keywords.map((kw, i) => {
            const isMatch = q && kw.toLowerCase().includes(q);
            return (
              <span
                key={kw}
                className={`inline-block rounded-md px-2 py-1 text-xs ${
                  i < 2
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : isMatch
                      ? "bg-yellow-100 text-yellow-800 font-medium"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {kw}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          ★ 앞 2개 = 검색량 조회 대표 키워드
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function TaxonomySubTab() {
  const [selectedCategory, setSelectedCategory] =
    useState<KeywordCategorySlug | null>(null);
  const [filter, setFilter] = useState("");

  const stats = useMemo(() => {
    const totalGroups = CATEGORY_KEYWORDS.reduce(
      (s, c) => s + c.subGroups.length,
      0
    );
    const totalKw = CATEGORY_KEYWORDS.reduce(
      (s, c) => s + c.subGroups.reduce((ss, g) => ss + g.keywords.length, 0),
      0
    );
    return { categories: CATEGORY_KEYWORDS.length, totalGroups, totalKw };
  }, []);

  const selectedCat = useMemo(
    () => CATEGORY_KEYWORDS.find((c) => c.slug === selectedCategory) ?? null,
    [selectedCategory]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">키워드 택소노미</h2>
        <p className="mt-1 text-sm text-gray-500">
          {stats.categories}개 카테고리 · {stats.totalGroups}개 서브그룹 ·{" "}
          {stats.totalKw}개 키워드
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "카테고리", value: stats.categories, icon: Hash },
          { label: "서브그룹", value: stats.totalGroups, icon: Layers },
          { label: "키워드", value: stats.totalKw, icon: Tag },
        ].map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <StatIcon size={18} className="text-primary" />
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category card grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리 개요
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_KEYWORDS.map((cat) => (
            <CategoryCard
              key={cat.slug}
              cat={cat}
              isSelected={selectedCategory === cat.slug}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.slug ? null : cat.slug
                )
              }
            />
          ))}
        </div>
      </section>

      {/* Detail panel (shown when a category is selected) */}
      {selectedCat && (
        <section>
          {/* Search within selected category */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="서브그룹, 키워드 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <CategoryDetail
            cat={selectedCat}
            onBack={() => {
              setSelectedCategory(null);
              setFilter("");
            }}
            filter={filter}
          />
        </section>
      )}
    </div>
  );
}
