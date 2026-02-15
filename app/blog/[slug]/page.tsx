import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Phone, Clock } from "lucide-react";
import { CLINIC, BASE_URL } from "@/lib/constants";
import {
  BLOG_POSTS_META,
  getPostBySlug,
  getRelatedTreatmentId,
  categoryColors,
} from "@/lib/blog";
import { TREATMENTS } from "@/lib/constants";
import { getBlogPostJsonLd, getBreadcrumbJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import BlogShareButton from "@/components/blog/BlogShareButton";
import LikeButton from "@/components/blog/LikeButton";

// 빌드 시점 기준 발행일이 지난 포스트만 정적 생성 (예약 발행)
export function generateStaticParams() {
  const today = new Date().toISOString().slice(0, 10);
  return BLOG_POSTS_META
    .filter((post) => post.date <= today)
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  // 미발행 포스트는 메타데이터 미생성
  const today = new Date().toISOString().slice(0, 10);
  if (post.date > today) return {};

  const fullTitle = `${post.title} — ${post.subtitle}`;

  return {
    title: fullTitle,
    description: post.excerpt,
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      title: `${fullTitle} | ${CLINIC.name} 블로그`,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      section: post.category,
      tags: post.tags,
      authors: [`${CLINIC.name}`],
      url: `${BASE_URL}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  // 미발행 포스트는 404
  const today = new Date().toISOString().slice(0, 10);
  if (post.date > today) notFound();

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${year}.${month}.${day}`;
  };

  // 같은 카테고리의 관련 포스트 (현재 포스트 제외, 미발행 제외, 최대 3개)
  const relatedPosts = BLOG_POSTS_META.filter(
    (p) => p.category === post.category && p.id !== post.id && p.date <= today
  ).slice(0, 3);

  const blogPostJsonLd = getBlogPostJsonLd(post);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "블로그", href: "/blog" },
    { name: post.title, href: `/blog/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* 블로그 포스트 */}
      <article>
        {/* 헤더 */}
        <header className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16">
          <div className="mx-auto max-w-3xl px-4">
            <Link
              href="/blog"
              className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={14} />
              블로그 목록
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[post.category] ?? "bg-gray-100 text-gray-600"}`}
              >
                {post.category}
              </span>
              <span className="text-sm text-gray-400">
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock size={13} />
                {post.readTime} 읽기
              </span>
            </div>

            <h1 className="font-headline text-3xl font-bold leading-tight text-gray-900 md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">
              {post.subtitle}
            </p>
          </div>
        </header>

        {/* 본문 */}
        <section className="section-padding bg-white">
          <FadeIn className="mx-auto max-w-3xl">
            <div className="space-y-10">
              {post.content.map((section) => (
                <div key={section.heading}>
                  <h2 className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-2xl">
                    {section.heading}
                  </h2>
                  <p className="text-base leading-relaxed text-gray-700 md:text-lg">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>
      </article>

      {/* 관련 진료 배너 */}
      {(() => {
        const treatmentId = getRelatedTreatmentId(post.category);
        if (!treatmentId) return null;
        const treatment = TREATMENTS.find((t) => t.id === treatmentId);
        if (!treatment) return null;
        return (
          <section className="bg-white px-4 pb-4">
            <FadeIn className="mx-auto max-w-3xl">
              <Link
                href={treatment.href}
                className="group flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-5 transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div>
                  <span className="mb-1 block text-xs font-medium text-[var(--color-gold)]">
                    관련 진료
                  </span>
                  <span className="text-base font-bold text-gray-900">
                    {treatment.name}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {treatment.shortDesc}
                  </span>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-transform group-hover:translate-x-0.5">
                  <ArrowRight size={16} />
                </span>
              </Link>
            </FadeIn>
          </section>
        );
      })()}

      {/* 좋아요 + 공유 + 목록 돌아가기 */}
      <section className="bg-white px-4 pb-12">
        <div className="mx-auto flex max-w-3xl items-center justify-between border-t border-gray-100 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} />
            목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <LikeButton slug={post.slug} />
            <BlogShareButton slug={post.slug} title={post.title} />
          </div>
        </div>
      </section>

      {/* 관련 포스트 */}
      {relatedPosts.length > 0 && (
        <section className="section-padding bg-gray-50">
          <div className="container-narrow">
            <FadeIn>
              <h2 className="font-headline mb-8 text-center text-2xl font-bold text-gray-900 md:text-3xl">
                관련 글
              </h2>
            </FadeIn>
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((rp) => (
                <StaggerItem key={rp.id}>
                  <Link href={`/blog/${rp.slug}`} className="block h-full">
                    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg">
                      <span
                        className={`mb-3 w-fit rounded-full px-3 py-1 text-xs font-medium ${categoryColors[rp.category] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {rp.category}
                      </span>
                      <h3 className="mb-1 text-base font-bold leading-snug text-gray-900">
                        {rp.title}
                      </h3>
                      <p className="mb-2 text-sm text-gray-500">
                        {rp.subtitle}
                      </p>
                      <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-2">
                        {rp.excerpt}
                      </p>
                      <div className="flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
                        <span>{formatDate(rp.date)}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {rp.readTime} 읽기
                        </span>
                      </div>
                    </article>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-[var(--color-primary)] px-4 py-16 text-center text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--color-gold)]/10" />
        <h2 className="font-headline relative mb-4 text-2xl font-bold md:text-3xl">
          구강 건강이 궁금하신가요?
        </h2>
        <p className="relative mb-8 text-blue-100">
          {CLINIC.name}에서 정확한 진단과 맞춤 치료를 받으세요.
        </p>
        <div className="relative flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] hover:bg-blue-50"
          >
            상담 문의
            <ArrowRight size={18} />
          </Link>
          <a
            href={CLINIC.phoneHref}
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] hover:bg-blue-50"
          >
            <Phone size={18} />
            전화 상담 {CLINIC.phone}
          </a>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
