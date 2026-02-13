"use client";

import { useState, useCallback } from "react";
import { Share2, Check, Clock } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog-posts";
import type { BlogCategory } from "@/lib/blog-posts";
import { BASE_URL } from "@/lib/constants";

export default function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory>("전체");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredPosts =
    activeCategory === "전체"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((post) => post.category === activeCategory);

  const handleShare = useCallback(
    async (postId: number, slug: string, title: string) => {
      const url = `${BASE_URL}/blog/${slug}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch {
          // 사용자가 공유를 취소한 경우 — clipboard 복사로 대체하지 않음
          return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(postId);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // clipboard API 미지원 시 fallback
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(postId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${year}.${month}.${day}`;
  };

  const categoryColors: Record<string, string> = {
    구강관리: "bg-blue-100 text-blue-700",
    예방치료: "bg-green-100 text-green-700",
    치아상식: "bg-purple-100 text-purple-700",
    생활습관: "bg-[#FDF3E0] text-[var(--color-gold-dark)]",
  };

  return (
    <section className="section-padding bg-white">
      <div className="container-narrow">
        {/* 카테고리 필터 */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 포스트 그리드 */}
        <StaggerContainer
          key={activeCategory}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredPosts.map((post) => (
            <StaggerItem key={post.id}>
              <article className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-gray-200 hover:bg-white hover:shadow-lg md:p-8">
                {/* 상단: 카테고리 + 공유 */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[post.category] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {post.category}
                  </span>
                  <button
                    onClick={() =>
                      handleShare(post.id, post.slug, post.title)
                    }
                    className="relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label={`"${post.title}" 공유하기`}
                  >
                    {copiedId === post.id ? (
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

                {/* 제목 + 본문 */}
                <h2 className="mb-3 text-lg font-bold leading-snug text-gray-900">
                  {post.title}
                </h2>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-600">
                  {post.excerpt}
                </p>

                {/* 하단: 날짜 + 읽기 시간 */}
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  <span>{formatDate(post.date)}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readTime} 읽기
                  </span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {filteredPosts.length === 0 && (
          <p className="py-20 text-center text-gray-400">
            해당 카테고리의 글이 아직 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
