import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { CLINIC, BASE_URL } from "@/lib/constants";
import {
  getRelatedTreatmentId,
  categoryColors,
  getCategoryLabel,
  getCategoryFromSlug,
  getBlogPostUrl,
} from "@/lib/blog";
import { TREATMENTS } from "@/lib/constants";
import { getBlogPostJsonLd, getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { CTABanner } from "@/components/ui/CTABanner";
import BlogShareButton from "@/components/blog/BlogShareButton";
import LikeButtonLazy from "@/components/blog/LikeButtonLazy";
import { formatDate } from "@/lib/format";
import {
  getPostBySlug,
  getAllPublishedPostMetas,
  getRelatedPosts,
} from "@/lib/blog-supabase";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { AdminDraftBar } from "@/components/admin/AdminDraftBar";
import TableOfContents from "@/components/blog/TableOfContents";

export const revalidate = 3600;

const META_DESCRIPTION_MIN = 150;
const META_DESCRIPTION_MAX = 160;

function fitMetaDescription(base: string): string {
  const normalized = base.replace(/\s+/g, " ").trim();

  if (normalized.length > META_DESCRIPTION_MAX) {
    return `${normalized.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  if (normalized.length >= META_DESCRIPTION_MIN) {
    return normalized;
  }

  const expanded = `${normalized} 핵심 체크포인트와 예방 관리 기준, 내원 시점을 함께 확인해 보세요.`;

  if (expanded.length > META_DESCRIPTION_MAX) {
    return `${expanded.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  return expanded;
}

function getPostMetaDescription(post: { excerpt: string; subtitle: string }): string {
  const excerpt = post.excerpt.replace(/\s+/g, " ").trim();
  const base = excerpt.length >= 120
    ? excerpt
    : `${excerpt} ${post.subtitle}. 원인, 치료 방법, 예방 관리와 내원 시점을 ${CLINIC.name} 건강칼럼에서 정리했습니다.`;

  return fitMetaDescription(base);
}

export async function generateStaticParams() {
  const posts = await getAllPublishedPostMetas();
  return posts.map((post) => ({
    category: post.category,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  if (!getCategoryFromSlug(category)) return {};

  const post = await getPostBySlug(slug);
  if (!post) return {};

  const fullTitle = `${post.title} — ${post.subtitle}`;
  const ogTitle = `${fullTitle} | ${CLINIC.name} 건강칼럼`;
  const postUrl = `${BASE_URL}${getBlogPostUrl(slug, post.category)}`;
  const metaDescription = getPostMetaDescription(post);

  return {
    title: fullTitle,
    description: metaDescription,
    alternates: { canonical: postUrl },
    openGraph: {
      title: ogTitle,
      description: metaDescription,
      siteName: CLINIC.name,
      locale: "ko_KR",
      type: "article",
      publishedTime: post.date,
      ...(post.dateModified && { modifiedTime: post.dateModified }),
      section: getCategoryLabel(post.category),
      tags: post.tags,
      authors: [`${CLINIC.name}`],
      url: postUrl,
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: CLINIC.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: metaDescription,
      images: ["/images/og-image.jpg"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  // 카테고리 슬러그 유효성 검증
  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) notFound();

  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const categoryLabel = getCategoryLabel(post.category);

  // URL의 카테고리와 포스트의 실제 카테고리가 다르면 정규 URL로 리다이렉트
  if (post.category !== category) {
    permanentRedirect(getBlogPostUrl(slug, post.category));
  }

  // 같은 카테고리의 관련 포스트 (현재 포스트 제외, 최대 3개)
  const relatedPosts = await getRelatedPosts(post.category, post.slug, 3);

  const blogPostJsonLd = getBlogPostJsonLd(post);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
    { name: categoryLabel, href: `/blog/${post.category}` },
    { name: post.title, href: getBlogPostUrl(slug, post.category) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogPostJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* 블로그 포스트 */}
      <article>
        {/* 헤더 */}
        <header className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16">
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
                <Link
                  href={`/blog/${post.category}`}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${categoryColors[post.category as keyof typeof categoryColors] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {categoryLabel}
                </Link>
                <span className="text-sm text-gray-500">
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={13} />
                  {post.readTime ?? "1분"} 읽기
                </span>
                <AdminEditButton href={`/admin?tab=blog&edit=${slug}`} />
              </div>

              <h1 className="font-headline text-3xl font-bold leading-tight text-gray-900 sm:text-4xl md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-3 text-lg text-gray-500 md:text-xl">
                {post.subtitle}
              </p>
            </FadeIn>
          </div>
        </header>

        {/* 본문 */}
        <section className="section-padding bg-white">
          <FadeIn className="mx-auto max-w-3xl">
            {post.content.length >= 3 && (
              <TableOfContents headings={post.content.map((s) => s.heading)} />
            )}
            <div className="space-y-10">
              {post.content.map((section, index) => (
                <div key={section.heading} id={`section-${index}`}>
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
                  <span className="mb-1 block text-sm font-medium text-[var(--color-gold)]">
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
            href={`/blog/${post.category}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={16} />
            {categoryLabel} 목록으로
          </Link>
          <div className="flex items-center gap-2">
            <LikeButtonLazy slug={post.slug} />
            <BlogShareButton slug={post.slug} title={post.title} category={post.category} />
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
                <StaggerItem key={rp.slug}>
                  <Link href={getBlogPostUrl(rp.slug, rp.category)} className="block h-full">
                    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg">
                      <span
                        className={`mb-3 w-fit rounded-full px-3 py-1 text-sm font-medium ${categoryColors[rp.category as keyof typeof categoryColors] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {getCategoryLabel(rp.category)}
                      </span>
                      <h3 className="mb-1 text-base font-bold leading-snug text-gray-900">
                        {rp.title}
                      </h3>
                      <p className="mb-2 text-sm text-gray-500">
                        {rp.subtitle}
                      </p>
                      <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-700 line-clamp-2">
                        {rp.excerpt}
                      </p>
                      <div className="flex items-center gap-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
                        <span>{formatDate(rp.date)}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
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
      {(() => {
        const ctaTreatmentId = getRelatedTreatmentId(post.category);
        const ctaTreatment = ctaTreatmentId ? TREATMENTS.find((t) => t.id === ctaTreatmentId) : null;
        return (
          <CTABanner
            heading={ctaTreatment ? `${ctaTreatment.name}, 자세한 상담이 필요하신가요?` : "구강 건강이 궁금하신가요?"}
            description={ctaTreatment
              ? `${CLINIC.name}에서 1:1 맞춤 ${ctaTreatment.name} 상담을 받으세요.`
              : `${CLINIC.name}에서 정확한 진단과 맞춤 치료를 받으세요.`}
          />
        );
      })()}

      <AdminDraftBar slug={slug} />

      <div className="h-16 md:hidden" />
    </>
  );
}
