import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpenText, Clock } from "lucide-react";
import { CLINIC, BASE_URL } from "@/lib/constants";
import {
  getRelatedTreatmentId,
  categoryColors,
  getCategoryLabel,
  getCategoryFromSlug,
  getBlogPostUrl,
} from "@/lib/blog";
import { TREATMENTS } from "@/lib/constants";
import { getBlogPostJsonLd, getBreadcrumbJsonLd, getFaqJsonLd, serializeJsonLd } from "@/lib/jsonld";
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
import { AdminDraftBar } from "@/components/admin/AdminDraftBar";
import TableOfContents from "@/components/blog/TableOfContents";
import type { BlogBlock, BlogPostSection } from "@/lib/blog";
import { InlineBlogEditButton } from "@/components/admin/InlineBlogEditButton";

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

function getHeadingList(post: { content?: BlogPostSection[]; blocks?: BlogBlock[] }): string[] {
  if (post.blocks && post.blocks.length > 0) {
    return post.blocks
      .filter((block): block is Extract<BlogBlock, { type: "heading" }> => block.type === "heading")
      .map((block) => block.text);
  }

  return (post.content ?? []).map((section) => section.heading);
}

function getFaqEntries(post: { content?: BlogPostSection[]; blocks?: BlogBlock[] }) {
  if (post.blocks && post.blocks.length > 0) {
    return post.blocks
      .filter((block): block is Extract<BlogBlock, { type: "faq" }> => block.type === "faq")
      .map((block) => ({ q: block.question, a: block.answer }));
  }

  return (post.content ?? [])
    .filter((section) => section.heading.trimEnd().endsWith("?"))
    .map((section) => ({ q: section.heading, a: section.content }));
}

function renderLegacySections(sections: BlogPostSection[]) {
  return sections.map((section, index) => (
    <div key={section.heading} id={`section-${index}`}>
      <h2 className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-3xl">
        {section.heading}
      </h2>
      <p className="text-base leading-relaxed text-gray-700 md:text-lg">
        {section.content}
      </p>
    </div>
  ));
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function getReferenceSource(href: string): { label: string; host: string; isOfficial: boolean } | null {
  try {
    const { hostname } = new URL(href);
    const normalized = hostname.replace(/^www\./, "");

    if (normalized.includes("nhs.uk")) {
      return { label: "NHS", host: normalized, isOfficial: true };
    }
    if (normalized.includes("fda.gov")) {
      return { label: "FDA", host: normalized, isOfficial: true };
    }
    if (normalized.includes("mouthhealthy.org") || normalized.includes("ada.org")) {
      return { label: "ADA", host: normalized, isOfficial: true };
    }
    if (normalized.includes("diabetes.org")) {
      return { label: "미국당뇨병학회", host: normalized, isOfficial: true };
    }

    return { label: "외부 자료", host: normalized, isOfficial: false };
  } catch {
    return null;
  }
}

function renderBlocks(blocks: BlogBlock[]) {
  let headingIndex = -1;

  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        headingIndex += 1;
        const HeadingTag = block.level === 3 ? "h3" : "h2";
        return (
          <div key={`block-${index}`} id={`section-${headingIndex}`} className="pt-4">
            <HeadingTag className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-3xl">
              {block.text}
            </HeadingTag>
          </div>
        );
      }
      case "paragraph":
        return (
          <p key={`block-${index}`} className="text-base leading-relaxed text-gray-700 md:text-lg">
            {block.text}
          </p>
        );
      case "list": {
        const ListTag = block.style === "number" ? "ol" : "ul";
        return (
          <ListTag
            key={`block-${index}`}
            className={`space-y-2 pl-5 text-base leading-relaxed text-gray-700 md:text-lg ${
              block.style === "number" ? "list-decimal" : "list-disc"
            }`}
          >
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ListTag>
        );
      }
      case "faq":
        return (
          <div key={`block-${index}`} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <h2 className="font-headline mb-3 text-lg font-bold text-gray-900 md:text-xl">
              {block.question}
            </h2>
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">
              {block.answer}
            </p>
          </div>
        );
      case "relatedLinks": {
        const allExternal = block.items.every((item) => isExternalHref(item.href));
        const sectionTitle = allExternal ? "공식 참고 자료" : "함께 읽으면 좋은 글";
        const sectionClasses = allExternal
          ? "rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5"
          : "rounded-2xl border border-gray-200 bg-gray-50 p-5";

        return (
          <div key={`block-${index}`} className={sectionClasses}>
            <div className="mb-4 flex items-center gap-2">
              {allExternal && <BookOpenText className="h-4 w-4 text-sky-700" aria-hidden="true" />}
              <h2 className="font-headline text-lg font-bold text-gray-900 md:text-xl">
                {sectionTitle}
              </h2>
            </div>
            <div className="space-y-3">
              {block.items.map((item) => {
                const external = isExternalHref(item.href);
                const source = external ? getReferenceSource(item.href) : null;
                const cardClasses = external
                  ? "block rounded-xl border border-sky-100 bg-white/90 p-4 transition-all hover:border-sky-200 hover:shadow-sm"
                  : "block rounded-xl bg-white p-4 transition-shadow hover:shadow-sm";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={cardClasses}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {source && (
                          <div className="mb-2 flex items-center gap-2 text-xs">
                            <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-800">
                              {source.label}
                            </span>
                            <span className="truncate text-gray-500">{source.host}</span>
                          </div>
                        )}
                        <p className="font-semibold text-gray-900">{item.title}</p>
                      </div>
                      {external && <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
                    )}
                    {source?.isOfficial && (
                      <p className="mt-2 text-xs text-gray-500">새 창에서 열리는 공식 환자 안내 자료입니다.</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  });
}

function getBlogCtaCopy(slug: string, category: string, relatedTreatmentName?: string | null) {
  const slugMap: Record<string, { heading: string; description: string }> = {
    "gimpo-implant-clinic-checklist": {
      heading: "김포 임플란트 상담이 필요하신가요?",
      description: "서울본치과에서 현재 치아와 잇몸 상태를 바탕으로 꼭 필요한 치료인지부터 차분히 안내해드립니다.",
    },
    "loose-tooth-does-it-need-extraction": {
      heading: "흔들리는 치아, 지금 상태를 확인해보세요",
      description: "발치가 필요한지, 살릴 수 있는지 원인부터 정확히 확인하는 것이 중요합니다.",
    },
    "broken-tooth-emergency": {
      heading: "깨진 치아, 빠르게 확인이 필요하신가요?",
      description: "응급처럼 보여도 손상 범위에 따라 치료 방향이 달라질 수 있습니다. 서울본치과에서 차분히 안내해드립니다.",
    },
    "implant-eligibility-checklist": {
      heading: "건강 상태 때문에 임플란트가 고민되시나요?",
      description: "당뇨·고혈압·골다공증이 있어도 현재 상태에 따라 가능한 치료 방향은 달라질 수 있습니다.",
    },
    "how-to-choose-a-trustworthy-dentist": {
      heading: "믿고 상담받을 치과를 찾고 계시나요?",
      description: "서울본치과에서 현재 상태와 꼭 필요한 치료 범위를 편하게 상담받아보세요.",
    },
  };

  if (slugMap[slug]) return slugMap[slug];

  const categoryMap: Record<string, { heading: string; description: string }> = {
    implant: {
      heading: "임플란트 상담이 필요하신가요?",
      description: "서울본치과에서 현재 잇몸과 치아 상태를 바탕으로 맞춤 치료 방향을 안내해드립니다.",
    },
    pediatric: {
      heading: "아이 치아 상태가 걱정되시나요?",
      description: "서울본치과에서 성장기 치아와 생활 습관을 함께 살펴보고 편하게 안내해드립니다.",
    },
    "health-tips": {
      heading: "지금 상태를 확인해보는 것이 좋을까요?",
      description: "증상이 반복되거나 걱정된다면 서울본치과에서 현재 상태를 차분히 확인해보세요.",
    },
    prevention: {
      heading: "잇몸과 치아 관리, 지금 점검해보세요",
      description: "서울본치과에서 현재 구강 상태와 필요한 관리 방법을 정확히 안내해드립니다.",
    },
    restorative: {
      heading: "치아를 살릴 수 있는지 먼저 확인해보세요",
      description: "서울본치과에서 현재 손상 정도와 적절한 치료 방향을 차분히 설명해드립니다.",
    },
    prosthetics: {
      heading: "내게 맞는 보철 치료가 궁금하신가요?",
      description: "서울본치과에서 치아 상태와 생활 편의를 함께 고려해 맞춤 치료를 안내해드립니다.",
    },
    orthodontics: {
      heading: "교정이 필요한 상태인지 궁금하신가요?",
      description: "서울본치과에서 현재 물림과 치열 상태를 바탕으로 적절한 시기를 안내해드립니다.",
    },
  };

  return categoryMap[category] ?? {
    heading: relatedTreatmentName ? `${relatedTreatmentName}, 자세한 상담이 필요하신가요?` : "구강 건강이 궁금하신가요?",
    description: relatedTreatmentName
      ? `${CLINIC.name}에서 1:1 맞춤 ${relatedTreatmentName} 상담을 받으세요.`
      : `${CLINIC.name}에서 정확한 진단과 맞춤 치료를 받으세요.`,
  };
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

  const faqEntries = getFaqEntries(post);
  const faqJsonLd = faqEntries.length >= 2
    ? getFaqJsonLd(faqEntries)
    : null;
  const headings = getHeadingList(post);
  const hasManualRelatedLinks =
    !!post.blocks?.some((block) => block.type === "relatedLinks");

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
    { name: categoryLabel, href: `/blog/${post.category}` },
    { name: post.title, href: getBlogPostUrl(slug, post.category) },
  ]);

  const relatedTreatmentId = getRelatedTreatmentId(post.category);
  const relatedTreatment = relatedTreatmentId ? TREATMENTS.find((t) => t.id === relatedTreatmentId) ?? null : null;
  const globalCta = getBlogCtaCopy(slug, post.category, relatedTreatment?.name ?? null);

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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}

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
                <InlineBlogEditButton
                  post={{
                    slug,
                    title: post.title,
                    subtitle: post.subtitle,
                    excerpt: post.excerpt,
                    category: post.category,
                    tags: post.tags,
                    date: post.date,
                    content: post.content,
                    blocks: post.blocks,
                  }}
                />
              </div>

              <h1 className="font-headline text-3xl font-bold leading-tight text-gray-900 sm:text-4xl md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-3 text-lg text-gray-600 md:text-xl">
                {post.subtitle}
              </p>
            </FadeIn>
          </div>
        </header>

        {/* 본문 */}
        <section className="bg-white px-4 pt-10 pb-16 md:px-6 md:pt-12 md:pb-20 lg:px-8 lg:pb-24">
          <FadeIn className="mx-auto max-w-3xl">
            {headings.length >= 3 && (
              <TableOfContents headings={headings} />
            )}
            <div className="space-y-10">
              {post.blocks && post.blocks.length > 0
                ? renderBlocks(post.blocks)
                : renderLegacySections(post.content ?? [])}
            </div>
          </FadeIn>
        </section>
      </article>

      {/* 관련 진료 배너 */}
      {relatedTreatment && (
        <section className="bg-white px-4 py-4">
          <FadeIn className="mx-auto max-w-3xl">
            <Link
              href={relatedTreatment.href}
              className="group flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-5 transition-all hover:border-blue-200 hover:shadow-md"
            >
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
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-transform group-hover:translate-x-0.5">
                <ArrowRight size={16} />
              </span>
            </Link>
          </FadeIn>
        </section>
      )}

      {/* 좋아요 + 공유 + 목록 돌아가기 */}
      <section className="bg-white px-4 pt-6 pb-12">
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
      {!hasManualRelatedLinks && relatedPosts.length > 0 && (
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
      <CTABanner
        heading={globalCta.heading}
        description={globalCta.description}
      />

      <AdminDraftBar slug={slug} />

      <div className="h-16 md:hidden" />
    </>
  );
}
