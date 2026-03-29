import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { CLINIC, DOCTORS, BASE_URL } from "@/lib/constants";
import {
  categoryColors,
  getCategoryLabel,
  getCategoryFromSlug,
  getBlogPostUrl,
  getRelatedTreatmentId,
} from "@/lib/blog";
import { TREATMENTS } from "@/lib/constants";
import { FadeIn } from "@/components/ui/Motion";
import { CTABanner } from "@/components/ui/CTABanner";
import { formatDate } from "@/lib/format";
import { getPostBySlugFresh } from "@/lib/blog-supabase";
import TableOfContents from "@/components/blog/TableOfContents";
import {
  getHeadingList,
  renderLegacySections,
} from "@/components/blog/BlogPostRenderer";
import InlineBlocksEditor from "@/components/blog/InlineBlocksEditor";
import { BlogEditProvider } from "@/components/blog/BlogEditProvider";
import { InlineBlogEditButton } from "@/components/admin/InlineBlogEditButton";

// 항상 최신 내용을 반환 (캐시 우회)
export const dynamic = "force-dynamic";

// ----------------------------------------------------------------
// 프리뷰 페이지
// ----------------------------------------------------------------

export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) notFound();

  const post = await getPostBySlugFresh(slug);
  if (!post) notFound();

  const categoryLabel = getCategoryLabel(post.category);
  const headings = getHeadingList(post);

  const relatedTreatmentId = getRelatedTreatmentId(post.category);
  const relatedTreatment = relatedTreatmentId
    ? (TREATMENTS.find((t) => t.id === relatedTreatmentId) ?? null)
    : null;

  const publicUrl = `${BASE_URL}${getBlogPostUrl(slug, post.category)}`;

  return (
    <BlogEditProvider initialBlocks={post.blocks ?? []}>
      <article>
        {/* 헤더 */}
        <header className="bg-gradient-to-b from-blue-50 to-white pt-12 pb-16">
          <InlineBlogEditButton
            post={{
              slug,
              title: post.title,
              subtitle: post.subtitle,
              excerpt: post.excerpt,
              category: post.category,
              tags: post.tags,
              date: post.date,
              published: false,
              publicUrl,
            }}
          />
          <div className="mx-auto max-w-3xl px-4">
            <FadeIn>
              <Link
                href={`/blog/${post.category}`}
                className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--color-primary)]"
              >
                <ArrowLeft size={14} />
                {categoryLabel} 목록
              </Link>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColors[post.category as keyof typeof categoryColors] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {categoryLabel}
                </span>
                <span className="text-sm text-gray-500">{formatDate(post.date)}</span>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={13} />
                  {post.readTime ?? "1분"} 읽기
                </span>
              </div>

              <h1 className="font-headline text-3xl font-bold leading-tight text-gray-900 sm:text-4xl md:text-5xl">
                {post.title}
              </h1>
              <p className="blog-post-excerpt mt-3 text-lg text-gray-600 md:text-xl">
                {post.subtitle}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                <span className="font-medium text-gray-700">
                  {CLINIC.name} 원장 {DOCTORS[0].name}
                </span>
                <span className="mx-1.5">·</span>
                {DOCTORS[0].position}
              </p>
            </FadeIn>
          </div>
        </header>

        {/* 본문 */}
        <section className="bg-white px-4 pt-10 pb-16 md:px-6 md:pt-12 md:pb-20 lg:px-8 lg:pb-24">
          <FadeIn className="mx-auto max-w-3xl">
            {headings.length >= 3 && <TableOfContents headings={headings} />}
            <div className="space-y-10">
              {post.blocks && post.blocks.length > 0
                ? (
                  <InlineBlocksEditor
                    post={{
                      slug,
                      title: post.title,
                      subtitle: post.subtitle,
                      excerpt: post.excerpt,
                      category: post.category,
                      tags: post.tags,
                      date: post.date,
                    }}
                  />
                )
                : renderLegacySections(post.content ?? [])}
            </div>
          </FadeIn>
        </section>
      </article>

      {/* 관련 진료 배너 */}
      {relatedTreatment && (
        <section className="bg-white px-4 py-4">
          <FadeIn className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
              <div>
                <span className="mb-1 block text-sm font-medium text-[var(--color-gold)]">
                  관련 진료
                </span>
                <span className="text-base font-bold text-gray-900">
                  {relatedTreatment.name}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {relatedTreatment.shortDesc}
                </span>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <ArrowRight size={16} />
              </span>
            </div>
          </FadeIn>
        </section>
      )}

      {/* CTA (미리보기용 — 실제 전화 연결 없음) */}
      <CTABanner
        heading="미리보기 — CTA 영역"
        description="발행 후 카테고리에 맞는 CTA 문구가 표시됩니다."
      />
    </BlogEditProvider>
  );
}
