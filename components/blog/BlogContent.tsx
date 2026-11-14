"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import Link from "next/link";
import BlogCardTracker from "./BlogCardTracker";
import { blogCardAttributes } from "@/lib/blog/card-tracking";
import {
  Share2,
  Check,
  Clock,
  ArrowRight,
  Tag,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  BLOG_CATEGORY_SLUGS,
  BLOG_TAGS,
  categoryColors,
  getBlogPostUrl,
  getCategoryLabel,
} from "@/lib/blog";
import type { BlogCategoryFilter, BlogCategorySlug, BlogTag } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog/types";
import { BASE_URL } from "@/lib/constants";
import { buildTrackedShareUrl, shareUrl } from "@/lib/share";
import { getTodayKST } from "@/lib/date";
import { captureEvent } from "@/lib/posthog";
import { readListPosition, saveListPosition, type ListPosition } from "./listNavigation";

const POSTS_PER_PAGE = 12;

interface BlogFilterUrlState {
  category: BlogCategoryFilter;
  tag: BlogTag | null;
  query: string;
}

function readFilterUrlState(defaultCategory: BlogCategoryFilter): BlogFilterUrlState {
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  const tagParam = params.get("tag");
  const tag = tagParam && BLOG_TAGS.includes(tagParam as BlogTag)
    ? tagParam as BlogTag
    : null;
  const category = !tag && categoryParam && BLOG_CATEGORY_SLUGS.includes(categoryParam as BlogCategorySlug)
    ? categoryParam as BlogCategorySlug
    : tag
      ? "all"
      : defaultCategory;

  return {
    category,
    tag,
    query: params.get("q") ?? "",
  };
}

interface BlogContentProps {
  initialPosts: BlogPostMeta[];
  activeDefaultCategory?: BlogCategorySlug;
}

export default function BlogContent({ initialPosts, activeDefaultCategory }: BlogContentProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategoryFilter>(activeDefaultCategory ?? "all");
  const [activeTag, setActiveTag] = useState<BlogTag | null>(null);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [categoryScrollEdges, setCategoryScrollEdges] = useState({ left: false, right: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const activeCategoryButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUrlStateReadyRef = useRef(false);
  const restorePositionRef = useRef<ListPosition | null>(null);

  const syncFilterUrl = useCallback((state: BlogFilterUrlState, mode: "push" | "replace") => {
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("tag");
    url.searchParams.delete("q");

    if (state.category !== "all") url.searchParams.set("category", state.category);
    if (state.tag) url.searchParams.set("tag", state.tag);
    if (state.query.trim()) url.searchParams.set("q", state.query);

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    if (mode === "push") {
      window.history.pushState(null, "", nextUrl);
    } else {
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  useLayoutEffect(() => {
    const applyUrlState = () => {
      const state = readFilterUrlState(activeDefaultCategory ?? "all");
      setActiveCategory(state.category);
      setActiveTag(state.tag);
      setSearchQuery(state.query);
      setDebouncedQuery(state.query);
      const position = readListPosition();
      restorePositionRef.current = position;
      setVisibleCount(position ? Math.min(position.count, initialPosts.length) : POSTS_PER_PAGE);
      setIsTagFilterOpen(false);
    };

    applyUrlState();
    isUrlStateReadyRef.current = true;
    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, [activeDefaultCategory, initialPosts.length]);

  useLayoutEffect(() => {
    const position = restorePositionRef.current;
    if (!position) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: position.y, behavior: "instant" });
      restorePositionRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [visibleCount, activeCategory, activeTag, debouncedQuery]);

  // setTimeout 정리
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try { localStorage.removeItem("born2smile_liked_slugs"); } catch {}
  }, []);

  // 검색어 debounce (250ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (isUrlStateReadyRef.current) {
        syncFilterUrl({ category: activeCategory, tag: activeTag, query: searchQuery }, "replace");
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeCategory, activeTag, searchQuery, syncFilterUrl]);

  // 날짜 기반 시드 셔플용 오늘 날짜 (shuffle seed로만 사용)
  const today = useMemo(() => getTodayKST(), []);

  // 일별 고정 시드 셔플 — SSR/CSR 동일 순서로 hydration 깜빡임 방지
  // 같은 날에는 동일 순서, 날짜가 바뀌면 새로운 셔플
  const shuffledPosts = useMemo(() => {
    const posts = [...initialPosts];
    // 날짜 기반 시드 생성 (간단한 해시)
    let seed = 0;
    for (let i = 0; i < today.length; i++) {
      seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
    }
    // seeded Fisher-Yates shuffle
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    for (let i = posts.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [posts[i], posts[j]] = [posts[j], posts[i]];
    }
    return posts;
  }, [initialPosts, today]);

  // 스크롤 시 자동으로 다음 페이지 로드
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + POSTS_PER_PAGE);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const filteredPosts = useMemo(() => shuffledPosts.filter((post) => {
    const categoryMatch =
      activeCategory === "all" || post.category === activeCategory;
    const tagMatch = !activeTag || post.tags.includes(activeTag);
    if (!categoryMatch || !tagMatch) return false;
    if (!debouncedQuery.trim()) return true;
    const q = debouncedQuery.trim().toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.subtitle.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q)
    );
  }), [shuffledPosts, activeCategory, activeTag, debouncedQuery]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;
  const resultCountText = `${filteredPosts.length}개의 글`;

  const updateCategoryScrollEdges = useCallback(() => {
    const scroller = categoryScrollRef.current;
    if (!scroller) return;
    setCategoryScrollEdges({
      left: scroller.scrollLeft > 2,
      right: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const scroller = categoryScrollRef.current;
    if (!scroller) return;

    const frameId = requestAnimationFrame(updateCategoryScrollEdges);
    const resizeObserver = new ResizeObserver(updateCategoryScrollEdges);
    resizeObserver.observe(scroller);
    scroller.addEventListener("scroll", updateCategoryScrollEdges, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", updateCategoryScrollEdges);
    };
  }, [updateCategoryScrollEdges]);

  useEffect(() => {
    if (activeTag || !activeCategoryButtonRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frameId = requestAnimationFrame(() => {
      const scroller = categoryScrollRef.current;
      const button = activeCategoryButtonRef.current;
      if (!scroller || !button) return;
      scroller.scrollTo({
        left: scroller.scrollLeft + button.getBoundingClientRect().left
          - scroller.getBoundingClientRect().left - (scroller.clientWidth - button.clientWidth) / 2,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeCategory, activeTag]);

  const handleCategoryClick = (cat: BlogCategoryFilter) => {
    setActiveCategory(cat);
    setActiveTag(null);
    setIsTagFilterOpen(false);
    setVisibleCount(POSTS_PER_PAGE);
    syncFilterUrl({ category: cat, tag: null, query: searchQuery }, "push");
  };

  const handleTagClick = (tag: BlogTag, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextTag = activeTag === tag ? null : tag;
    setActiveTag(nextTag);
    setActiveCategory("all");
    setIsTagFilterOpen(false);
    setVisibleCount(POSTS_PER_PAGE);
    syncFilterUrl({ category: "all", tag: nextTag, query: searchQuery }, "push");
  };

  const clearTagFilter = () => {
    setActiveTag(null);
    setVisibleCount(POSTS_PER_PAGE);
    syncFilterUrl({ category: "all", tag: null, query: searchQuery }, "push");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(POSTS_PER_PAGE);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setVisibleCount(POSTS_PER_PAGE);
    syncFilterUrl({ category: activeCategory, tag: activeTag, query: "" }, "replace");
    searchInputRef.current?.focus();
  };

  const resetFilters = () => {
    setActiveCategory("all");
    setActiveTag(null);
    setSearchQuery("");
    setDebouncedQuery("");
    setVisibleCount(POSTS_PER_PAGE);
    setIsTagFilterOpen(false);
    syncFilterUrl({ category: "all", tag: null, query: "" }, "push");
  };

  const handleShare = useCallback(
    async (
      e: React.MouseEvent,
      slug: string,
      title: string,
      category: BlogCategorySlug,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const trackedUrl = buildTrackedShareUrl(
        `${BASE_URL}${getBlogPostUrl(slug, category)}`,
        { slug, source: "list_card" },
      );
      const result = await shareUrl(trackedUrl, title);

      if (result !== "failed") {
        captureEvent("blog_post_shared", {
          blog_slug: slug,
          category,
          source: "list_card",
          surface: "list_card",
          method: result,
        });
      }

      if (result === "copied") {
        setCopiedSlug(slug);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedSlug(null), 2000);
      }
    },
    []
  );

  return (
    <section className="section-padding bg-[var(--surface)]">
      <BlogCardTracker contextKey={JSON.stringify([activeCategory, activeTag, debouncedQuery])} hasSearch={Boolean(debouncedQuery.trim())} categoryFilter={activeCategory} tagFilter={activeTag ?? "all"} />
      <div className="container-narrow">
        {/* 검색 */}
        <div className="mx-auto mb-6 max-w-md">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-light)]"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="궁금한 키워드를 검색해보세요"
              aria-label="건강칼럼 검색"
              className="min-h-11 w-full rounded-full border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] transition-colors [&::-webkit-search-cancel-button]:appearance-none focus:border-[var(--color-primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted-light)] transition-colors hover:text-[var(--muted)]"
                aria-label="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="relative mb-4">
          <div
            ref={categoryScrollRef}
            className="no-scrollbar flex gap-2 overflow-x-auto px-1 md:flex-wrap md:justify-center md:overflow-visible md:px-0"
            aria-label="건강칼럼 카테고리"
            onScroll={updateCategoryScrollEdges}
          >
            <button
              ref={activeCategory === "all" && !activeTag ? activeCategoryButtonRef : undefined}
              onClick={() => handleCategoryClick("all")}
              aria-pressed={activeCategory === "all" && !activeTag}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === "all" && !activeTag
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface)]"
              }`}
            >
              전체
            </button>
            {BLOG_CATEGORY_SLUGS.map((cat) => (
              <button
                key={cat}
                ref={activeCategory === cat && !activeTag ? activeCategoryButtonRef : undefined}
                onClick={() => handleCategoryClick(cat)}
                aria-pressed={activeCategory === cat && !activeTag}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat && !activeTag
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
          {categoryScrollEdges.left && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--surface)] to-transparent md:hidden"
            />
          )}
          {categoryScrollEdges.right && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--surface)] to-transparent md:hidden"
            />
          )}
        </div>

        {/* 상세 필터는 모든 화면에서 필요할 때 펼친다. */}
        <div className="mb-4 flex min-h-11 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsTagFilterOpen((open) => !open)}
            aria-expanded={isTagFilterOpen}
            aria-controls="blog-tag-filters"
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)]/30 hover:bg-[var(--background)]"
          >
            <SlidersHorizontal size={15} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              상세 필터{activeTag ? ` · ${activeTag}` : ""}
            </span>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`shrink-0 transition-transform ${isTagFilterOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-sm text-[var(--muted)]" aria-live="polite">
              {resultCountText}
            </span>
            {activeTag && (
              <button
                type="button"
                onClick={clearTagFilter}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label={`${activeTag} 필터 해제`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* 선택한 태그는 접힌 상태에서도 위 요약에 표시한다. */}
        <div
          id="blog-tag-filters"
          aria-label="글 유형·대상"
          className={`${isTagFilterOpen ? "flex" : "hidden"} mb-6 flex-wrap justify-center gap-1.5 rounded-2xl bg-[var(--background)] p-3`}
        >
          <p className="mb-1 w-full text-sm font-medium text-[var(--foreground)]">
            글 유형·대상
          </p>
          {BLOG_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              aria-pressed={activeTag === tag}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTag === tag
                  ? "bg-[var(--color-gold)] text-white"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              }`}
            >
              <Tag size={12} />
              {tag}
            </button>
          ))}
        </div>

        {/* 포스트 그리드 */}
        <div aria-live="polite" aria-atomic="false">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.map((post, position) => {
              const categorySlug = post.category as BlogCategorySlug;
              return (
              <div key={post.slug}>
                <article {...blogCardAttributes(getBlogPostUrl(post.slug, post.category), "listing", position + 1)} className="group relative flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition-all hover:border-[var(--color-primary)]/20 hover:bg-[var(--surface)] hover:shadow-lg md:p-8">
                  {/* 상단: 카테고리 + 읽기 시간 */}
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColors[categorySlug] ?? "bg-[var(--background)] text-[var(--muted)]"}`}
                    >
                      {getCategoryLabel(categorySlug)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-[var(--muted-light)]">
                      <Clock size={14} />
                      {post.readTime}
                    </span>
                  </div>

                  {/* 제목 + 부제 */}
                  <h2 className="mb-1 text-lg font-bold leading-snug text-[var(--foreground)] group-hover:text-[var(--color-primary)]">
                    <Link href={getBlogPostUrl(post.slug, post.category)} onClick={() => saveListPosition(getBlogPostUrl(post.slug, post.category), visibleCount)} className="relative z-10">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mb-3 text-sm font-medium text-[var(--muted)]">
                    {post.subtitle}
                  </p>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--foreground)] line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* 태그 */}
                  {post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => handleTagClick(tag, e)}
                          className={`relative z-10 inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
                            activeTag === tag
                              ? "bg-[var(--color-gold)] text-white"
                              : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--surface)]"
                          }`}
                        >
                          <Tag size={12} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 하단: 자세히 읽기 + 공유 */}
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]" aria-hidden="true">
                      자세히 읽기
                      <ArrowRight size={14} />
                    </span>
                    <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleShare(e, post.slug, post.title, categorySlug)}
                      className="relative z-10 flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                      aria-label={`"${post.title}" 공유하기`}
                    >
                      {copiedSlug === post.slug ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          <span className="text-green-600">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={14} />
                          <span>공유</span>
                        </>
                      )}
                    </button>
                    </div>
                  </div>

                  {/* 카드 전체 링크 (인터랙티브 요소 뒤에 배치) */}
                  <Link
                    href={getBlogPostUrl(post.slug, post.category)}
                    onClick={() => saveListPosition(getBlogPostUrl(post.slug, post.category), visibleCount)}
                    className="absolute inset-0 z-0 rounded-2xl"
                    aria-label={`${post.title} — ${post.subtitle} 읽기`}
                    tabIndex={-1}
                  />
                </article>
              </div>
              );
            })}
          </div>
        </div>

        {filteredPosts.length === 0 && (
          <div className="py-20 text-center" role="status">
            <p className="text-[var(--muted)]">
              {searchQuery.trim()
                ? `"${searchQuery.trim()}"에 대한 검색 결과가 없습니다.`
                : "해당 조건의 글이 아직 없습니다."}
            </p>
            {(activeCategory !== "all" || activeTag || searchQuery.trim()) && (
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                필터 초기화
              </button>
            )}
          </div>
        )}

        {/* 무한 스크롤 감지 센티넬 + 로딩 표시 */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center gap-3 py-8" role="status" aria-label="추가 글 로딩 중">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--color-primary)]" />
            <span className="text-sm text-[var(--muted)]">글을 더 불러오는 중…</span>
          </div>
        )}
        {!hasMore && filteredPosts.length > 0 && (
          <p className="mt-8 text-center text-sm text-[var(--muted)]">
            모든 글을 확인했습니다
          </p>
        )}
      </div>
    </section>
  );
}
