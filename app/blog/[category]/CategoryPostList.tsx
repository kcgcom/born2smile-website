import Link from "next/link";
import { getBlogPostUrl } from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog";
import { formatDate } from "@/lib/format";

interface CategoryPostListProps {
  posts: BlogPostMeta[];
}

export function CategoryPostList({ posts }: CategoryPostListProps) {
  return (
    <section className="bg-[var(--background)] px-4 py-10 md:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between md:mb-8">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--color-gold-text)] uppercase">
              All Posts
            </p>
            <h2 className="mt-2 font-headline text-2xl font-bold text-[var(--foreground)] md:text-3xl">
              전체 글 목록
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">총 {posts.length}개</p>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={getBlogPostUrl(post.slug, post.category)}
                className="group flex items-center justify-between gap-4 py-3.5 hover:text-[var(--color-primary)]"
              >
                <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--color-primary)] md:text-base">
                  {post.title}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted-light)] md:text-sm">
                  {formatDate(post.date)} · {post.readTime}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
