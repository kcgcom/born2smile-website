import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
import { categoryColors, getBlogPostUrl, getCategoryLabel } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog";
import { formatDate } from "@/lib/format";

interface CategoryPostListProps {
  posts: BlogPostMeta[];
}

export function CategoryPostList({ posts }: CategoryPostListProps) {
  return (
    <section className="bg-white px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
              All Posts
            </p>
            <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
              카테고리 전체 글
            </h2>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-gray-600 md:text-base">
              최신 글부터 읽으며 필요한 주제를 차근차근 확인해 보세요.
            </p>
          </div>
          <p className="text-sm text-gray-500">총 {posts.length}개 글</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-gray-200 hover:bg-white hover:shadow-md md:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${categoryColors[post.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {getCategoryLabel(post.category)}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  {post.readTime} 읽기
                </span>
              </div>

              <h3 className="line-clamp-3 text-lg font-bold leading-snug text-gray-900 group-hover:text-[var(--color-primary)] md:line-clamp-none">
                <Link href={getBlogPostUrl(post.slug, post.category)}>
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 line-clamp-2 text-pretty text-sm font-medium text-gray-600 md:line-clamp-none">{post.subtitle}</p>
              <p className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-gray-700 line-clamp-3">{post.excerpt}</p>

              {post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600"
                    >
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-500">
                <span>{formatDate(post.date)}</span>
                <Link
                  href={getBlogPostUrl(post.slug, post.category)}
                  className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                >
                  자세히 읽기
                  <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
