"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Share2, Check, Clock, ArrowRight, Tag, Search, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BLOG_POSTS_META,
  BLOG_CATEGORIES,
  BLOG_TAGS,
  categoryColors,
} from "@/lib/blog";
import type { BlogCategory, BlogTag } from "@/lib/blog";
import { BASE_URL } from "@/lib/constants";

const POSTS_PER_PAGE = 12;

export default function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory>("전체");
  const [activeTag, setActiveTag] = useState<BlogTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // setTimeout 정리
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // 발행일이 오늘 이하인 포스트만 표시 (예약 발행)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const publishedPosts = useMemo(
    () => BLOG_POSTS_META.filter((p) => p.date <= today),
    [today]
  );

  // SSR 초기값은 최신순 정렬 (크롤러에게 일관된 순서 제공)
  // 클라이언트 hydration 후 랜덤 셔플로 다양한 글 노출
  const sortedByDate = [...publishedPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const [shuffledPosts, setShuffledPosts] = useState(sortedByDate);
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const posts = [...publishedPosts];
      for (let i = posts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [posts[i], posts[j]] = [posts[j], posts[i]];
      }
      setShuffledPosts(posts);
    });
    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

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

  const filteredPosts = shuffledPosts.filter((post) => {
    const categoryMatch =
      activeCategory === "전체" || post.category === activeCategory;
    const tagMatch = !activeTag || post.tags.includes(activeTag);
    if (!categoryMatch || !tagMatch) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.subtitle.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q)
    );
  });

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  const handleCategoryClick = (cat: BlogCategory) => {
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
    setActiveCategory("전체");
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

  const handleShare = useCallback(
    async (
      e: React.MouseEvent,
      slug: string,
      title: string
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const url = `${BASE_URL}/blog/${slug}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch {
          return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedSlug(null), 2000);
      } catch {
        // clipboard API denied — silently fail
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${year}.${month}.${day}`;
  };

  const shouldReduce = useReducedMotion();
  const cardAnimation = shouldReduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true as const },
        transition: { duration: 0.3, ease: "easeOut" as const },
      };

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
          {BLOG_CATEGORIES.map((cat) => (
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
              {cat}
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
            {visiblePosts.map((post) => (
              <motion.div key={post.slug} {...cardAnimation}>
                <article className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-gray-200 hover:bg-white hover:shadow-lg md:p-8">
                  {/* 상단: 카테고리 + 공유 */}
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColors[post.category] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {post.category}
                    </span>
                    <button
                      onClick={(e) =>
                        handleShare(e, post.slug, post.title)
                      }
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
                          <span className="hidden sm:inline">공유</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 제목 + 부제 */}
                  <h2 className="mb-1 text-lg font-bold leading-snug text-gray-900 group-hover:text-[var(--color-primary)]">
                    <Link href={`/blog/${post.slug}`} className="relative z-10">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mb-3 text-sm font-medium text-gray-600">
                    {post.subtitle}
                  </p>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-700">
                    {post.excerpt}
                  </p>

                  {/* 태그 */}
                  {post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => handleTagClick(tag, e)}
                          className={`relative z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm transition-colors ${
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

                  {/* 하단: 날짜 + 읽기 시간 + 자세히 읽기 */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{formatDate(post.date)}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {post.readTime} 읽기
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                      자세히 읽기
                      <ArrowRight size={14} />
                    </span>
                  </div>

                  {/* 카드 전체 링크 (인터랙티브 요소 뒤에 배치) */}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="absolute inset-0 z-0 rounded-2xl"
                    aria-label={`${post.title} — ${post.subtitle} 읽기`}
                    tabIndex={-1}
                  />
                </article>
              </motion.div>
            ))}
          </div>
        </div>

        {filteredPosts.length === 0 && (
          <p className="py-20 text-center text-gray-500" role="status">
            {searchQuery.trim()
              ? `"${searchQuery.trim()}"에 대한 검색 결과가 없습니다.`
              : "해당 조건의 글이 아직 없습니다."}
          </p>
        )}

        {/* 무한 스크롤 감지 센티넬 */}
        {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
        {!hasMore && filteredPosts.length > 0 && (
          <p className="mt-8 text-center text-sm text-gray-500">
            모든 글을 확인했습니다
          </p>
        )}
      </div>
    </section>
  );
}
