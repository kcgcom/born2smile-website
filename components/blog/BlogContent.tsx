"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Share2, Check, Clock, ArrowRight, Tag, Search, X, Heart } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
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
import { shareUrl } from "@/lib/share";
import { getTodayKST } from "@/lib/date";

const POSTS_PER_PAGE = 12;

const USER_ID_KEY = "born2smile_uid";
const LIKED_SLUGS_KEY = "born2smile_liked_slugs";

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
}

interface BlogContentProps {
  initialPosts: BlogPostMeta[];
  activeDefaultCategory?: BlogCategorySlug;
}

export default function BlogContent({ initialPosts, activeDefaultCategory }: BlogContentProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategoryFilter>(activeDefaultCategory ?? "all");
  const [activeTag, setActiveTag] = useState<BlogTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [localLiked, setLocalLiked] = useState<Set<string>>(new Set());
  const [likingSlug, setLikingSlug] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // setTimeout 정리
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // liked 슬러그 localStorage에서 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIKED_SLUGS_KEY);
      if (stored) setLocalLiked(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, []);

  // 검색어 debounce (250ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

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

  const handleCategoryClick = (cat: BlogCategoryFilter) => {
    setActiveCategory(cat);
    setActiveTag(null);
    setVisibleCount(POSTS_PER_PAGE);
  };

  const handleTagClick = (tag: BlogTag, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveTag((prev) => (prev === tag ? null : tag));
    setActiveCategory("all");
    setVisibleCount(POSTS_PER_PAGE);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(POSTS_PER_PAGE);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setVisibleCount(POSTS_PER_PAGE);
    searchInputRef.current?.focus();
  };

  const handleLike = useCallback(async (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSupabaseConfigured || likingSlug) return;

    const uid = getUserId();
    const wasLiked = localLiked.has(slug);

    setLocalLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      try { localStorage.setItem(LIKED_SLUGS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    setLikingSlug(slug);

    try {
      await getSupabaseBrowserClient().rpc("toggle_like", { p_slug: slug, p_user_id: uid });
    } catch {
      setLocalLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.add(slug);
        } else {
          next.delete(slug);
        }
        try { localStorage.setItem(LIKED_SLUGS_KEY, JSON.stringify([...next])); } catch {}
        return next;
      });
    } finally {
      setLikingSlug(null);
    }
  }, [localLiked, likingSlug]);

  const handleShare = useCallback(
    async (
      e: React.MouseEvent,
      slug: string,
      title: string,
      category: BlogCategorySlug,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const result = await shareUrl(`${BASE_URL}${getBlogPostUrl(slug, category)}`, title);
      if (result === "copied") {
        setCopiedSlug(slug);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedSlug(null), 2000);
      }
    },
    []
  );

  return (
    <section className="section-padding bg-white">
      <div className="container-narrow">
        {/* 검색 */}
        <div className="mx-auto mb-6 max-w-md">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="궁금한 키워드를 검색해보세요"
              aria-label="건강칼럼 검색"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => handleCategoryClick("all")}
            aria-pressed={activeCategory === "all" && !activeTag}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === "all" && !activeTag
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {BLOG_CATEGORY_SLUGS.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              aria-pressed={activeCategory === cat && !activeTag}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat && !activeTag
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* 태그 필터 */}
        <div className="mb-10 flex flex-wrap justify-center gap-1.5">
          {BLOG_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              aria-pressed={activeTag === tag}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTag === tag
                  ? "bg-[var(--color-gold)] text-white"
                  : "border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Tag size={12} />
              {tag}
            </button>
          ))}
        </div>

        {/* 포스트 그리드 */}
        <div aria-live="polite" aria-atomic="false">
          <p className="mb-4 text-center text-sm text-gray-500">
            {filteredPosts.length > 0
              ? `${filteredPosts.length}개의 글`
              : null}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.map((post) => {
              const categorySlug = post.category as BlogCategorySlug;
              return (
              <div key={post.slug}>
                <article className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-gray-200 hover:bg-white hover:shadow-lg md:p-8">
                  {/* 상단: 카테고리 + 읽기 시간 */}
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColors[categorySlug] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {getCategoryLabel(categorySlug)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock size={14} />
                      {post.readTime}
                    </span>
                  </div>

                  {/* 제목 + 부제 */}
                  <h2 className="mb-1 text-lg font-bold leading-snug text-gray-900 group-hover:text-[var(--color-primary)]">
                    <Link href={getBlogPostUrl(post.slug, post.category)} className="relative z-10">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mb-3 text-sm font-medium text-gray-600">
                    {post.subtitle}
                  </p>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-700 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* 태그 */}
                  {post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => handleTagClick(tag, e)}
                          className={`relative z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
                            activeTag === tag
                              ? "bg-[var(--color-gold)] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Tag size={12} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 하단: 자세히 읽기 + 좋아요 + 공유 */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]" aria-hidden="true">
                      자세히 읽기
                      <ArrowRight size={14} />
                    </span>
                    <div className="flex items-center gap-1">
                      {isSupabaseConfigured && (
                        <button
                          onClick={(e) => handleLike(e, post.slug)}
                          disabled={likingSlug === post.slug}
                          className={`relative z-10 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-colors ${
                            localLiked.has(post.slug)
                              ? "text-rose-500 hover:bg-rose-50"
                              : "text-gray-400 hover:bg-gray-100 hover:text-rose-400"
                          }`}
                          aria-label={localLiked.has(post.slug) ? "좋아요 취소" : "좋아요"}
                        >
                          <Heart size={14} className={localLiked.has(post.slug) ? "fill-rose-500" : ""} />
                          <span>좋아요</span>
                        </button>
                      )}
                    <button
                      onClick={(e) => handleShare(e, post.slug, post.title, categorySlug)}
                      className="relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
          <p className="py-20 text-center text-gray-500" role="status">
            {searchQuery.trim()
              ? `"${searchQuery.trim()}"에 대한 검색 결과가 없습니다.`
              : "해당 조건의 글이 아직 없습니다."}
          </p>
        )}

        {/* 무한 스크롤 감지 센티넬 + 로딩 표시 */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-8" aria-label="추가 글 로딩 중">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--color-primary)]" />
          </div>
        )}
        {!hasMore && filteredPosts.length > 0 && (
          <p className="mt-8 text-center text-sm text-gray-500">
            모든 글을 확인했습니다
          </p>
        )}
      </div>
    </section>
  );
}
