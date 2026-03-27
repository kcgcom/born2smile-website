import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CircleHelp, FileText } from "lucide-react";
import { BASE_URL, CLINIC, TREATMENTS } from "@/lib/constants";
import {
  ALL_CATEGORY_SLUGS,
  categoryColors,
  getBlogPostUrl,
  getCategoryFromSlug,
  getCategoryLabel,
  getRelatedTreatmentId,
} from "@/lib/blog";
import type { BlogPostMeta } from "@/lib/blog";
import { getCategoryHub } from "@/lib/blog/category-hubs";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import {
  getBreadcrumbJsonLd,
  getCategoryCollectionJsonLd,
  getFaqJsonLd,
  serializeJsonLd,
} from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import { CategoryPostList } from "./CategoryPostList";
import { fitMetaDescription } from "@/lib/seo";

export const revalidate = 3600;

const CATEGORY_META_PAD = "증상별 글과 치료 전후 체크포인트를 함께 확인해 보세요.";
const prettyTextWrap = { textWrap: "pretty" as const };

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

const CATEGORY_SEO_KEYWORDS: Record<string, string[]> = {
  implant: ["김포 임플란트", "장기동 임플란트", "한강신도시 임플란트", "임플란트 정보", "김포 임플란트 치과"],
  orthodontics: ["김포 치아교정", "장기동 치아교정", "한강신도시 치아교정", "치아교정 정보", "김포 교정 치과"],
  prosthetics: ["김포 보철치료", "장기동 보철치료", "한강신도시 보철치료", "보철치료 정보", "김포 보철 치과"],
  restorative: ["김포 보존치료", "장기동 보존치료", "한강신도시 보존치료", "보존치료 정보", "김포 충치 치료"],
  pediatric: ["김포 소아치과", "장기동 소아치과", "한강신도시 소아치과", "소아치료 정보", "김포 어린이 치과"],
  prevention: ["김포 스케일링", "장기동 스케일링", "한강신도시 스케일링", "예방관리 정보", "김포 치과 검진"],
  "health-tips": ["구강 건강", "치아 건강 상식", "치과 건강 정보"],
};

function pickPostsBySlugs(posts: BlogPostMeta[], slugs: string[]) {
  const postMap = new Map(posts.map((post) => [post.slug, post]));
  return slugs
    .map((slug) => postMap.get(slug) ?? null)
    .filter((post): post is BlogPostMeta => post !== null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) return {};

  const hub = getCategoryHub(categorySlug);
  const categoryUrl = `${BASE_URL}/blog/${category}`;
  const isLocal = category !== "health-tips";
  const localTitle = isLocal ? `김포 ${hub.heroTitle}` : hub.heroTitle;
  const localDesc = fitMetaDescription(
    isLocal
      ? `김포 ${hub.heroTitle}, ${CLINIC.name}. ${hub.heroDescription}`
      : `${CLINIC.name} ${hub.heroDescription}`,
    CATEGORY_META_PAD,
  );
  const fullTitle = `${localTitle} | ${CLINIC.name} 건강칼럼`;

  return {
    title: localTitle,
    description: localDesc,
    keywords: CATEGORY_SEO_KEYWORDS[category] ?? [],
    alternates: { canonical: categoryUrl },
    openGraph: {
      title: fullTitle,
      description: localDesc,
      siteName: CLINIC.name,
      locale: "ko_KR",
      url: categoryUrl,
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
      title: fullTitle,
      description: localDesc,
      images: ["/images/og-image.jpg"],
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) notFound();

  const categoryLabel = getCategoryLabel(categorySlug);
  const hub = getCategoryHub(categorySlug);
  const allPosts = await getAllPublishedPostMetas();
  const categoryPosts = allPosts.filter((post) => post.category === categorySlug);
  const questionCards = hub.questions
    .map((item) => {
      const post = categoryPosts.find((candidate) => candidate.slug === item.slug);
      return post ? { ...item, post } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const groupedSections = hub.sections
    .map((section) => ({
      ...section,
      posts: pickPostsBySlugs(categoryPosts, section.slugs),
    }))
    .filter((section) => section.posts.length > 0);

  const treatmentId = getRelatedTreatmentId(categorySlug);
  const relatedTreatment = treatmentId
    ? TREATMENTS.find((treatment) => treatment.id === treatmentId) ?? null
    : null;

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
    { name: categoryLabel, href: `/blog/${category}` },
  ]);
  const collectionJsonLd = getCategoryCollectionJsonLd({
    title: hub.heroTitle,
    description: hub.heroDescription,
    categorySlug: category,
    posts: categoryPosts,
  });
  const faqJsonLd = questionCards.length > 0
    ? getFaqJsonLd(questionCards.map((item) => ({ q: item.question, a: item.answer })))
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
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

      <section className="bg-gradient-to-b from-blue-50 via-white to-white pt-28 pb-14 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-none lg:max-w-[60rem] xl:max-w-[66rem]">
              <p className="mb-3 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
                Health Column Hub
              </p>
              <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
                {hub.heroTitle}
              </h1>
              <p className="mt-5 text-base leading-relaxed text-gray-700 md:text-lg" style={prettyTextWrap}>
                {hub.heroDescription}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2.5 text-sm md:gap-3">
              <span className={`inline-flex rounded-full px-4 py-2 font-medium ${categoryColors[categorySlug] ?? "bg-gray-100 text-gray-600"}`}>
                {categoryLabel}
              </span>
              <span className="inline-flex rounded-full border border-gray-200 bg-white px-4 py-2 text-gray-600">
                총 {categoryPosts.length}개 글
              </span>
            </div>

            <p className="mt-6 max-w-none text-base leading-relaxed text-gray-600 md:text-lg lg:max-w-[58rem] xl:max-w-[62rem]">
              {hub.intro}
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
            >
              바로 상담하기
              <ArrowRight size={14} />
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="bg-white px-4 pb-8 md:px-6 md:pb-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
                  Browse Topics
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900 md:text-2xl">
                  다른 카테고리도 함께 살펴보세요
                </h2>
              </div>
              <Link href="/blog" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                건강칼럼 전체 보기 →
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 md:gap-2.5">
              {ALL_CATEGORY_SLUGS.map((slug) => {
                const isActive = slug === categorySlug;
                return (
                  <Link
                    key={slug}
                    href={`/blog/${slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {getCategoryLabel(slug)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8 md:px-6 md:py-10 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-8">
            <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
              Who It Helps
            </p>
            <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
              이런 분께 도움이 됩니다
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-gray-700 md:text-base">
              {hub.audience.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 text-[var(--color-primary)]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 md:p-8">
            <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
              Reading Guide
            </p>
            <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
              처음 읽는다면 이렇게 보세요
            </h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
              <li><strong className="text-gray-900">1.</strong> Common Questions에서 자주 묻는 질문의 핵심 답을 먼저 확인합니다.</li>
              <li><strong className="text-gray-900">2.</strong> 상황별 섹션에서 내 고민과 가까운 글을 고릅니다.</li>
              <li><strong className="text-gray-900">3.</strong> 전체 글 목록에서 더 깊은 주제를 차근차근 읽어 나갑니다.</li>
            </ol>
          </div>
        </div>
      </section>

      {questionCards.length > 0 && (
        <section className="bg-white px-4 py-8 md:px-6 md:py-10 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 md:mb-6">
              <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
                Common Questions
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
                자주 찾는 질문부터 읽어보세요
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 md:gap-4">
              {questionCards.map(({ question, answer, post }) => (
                <Link
                  key={question}
                  href={getBlogPostUrl(post.slug, post.category)}
                  className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-gray-200 hover:bg-white hover:shadow-md md:p-5"
                >
                  <div className="flex h-full items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)] ring-1 ring-blue-100 md:h-9 md:w-9">
                      <CircleHelp size={18} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-[var(--color-primary)] md:line-clamp-3">
                        {question}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2">
                        {answer}
                      </p>
                      <p className="mt-2.5 line-clamp-1 text-sm font-medium text-gray-700">
                        관련 글: {post.title}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-[var(--color-primary)]">
                        글 바로 읽기
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {groupedSections.length > 0 && (
        <section className="bg-gray-50 px-4 py-10 md:px-6 md:py-14 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 md:mb-8">
              <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
                Curated Paths
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
                상황별로 읽기
              </h2>
            </div>
            <div className="space-y-7 md:space-y-8">
              {groupedSections.map((section) => (
                <div key={section.title} className="rounded-3xl border border-gray-100 bg-white p-5 md:p-8">
                  <div className="mb-4 max-w-none md:mb-5 lg:max-w-3xl xl:max-w-4xl">
                    <h3 className="text-xl font-bold text-gray-900 md:text-2xl">{section.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                      {section.description}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
                    {section.posts.map((post) => (
                      <Link
                        key={post.slug}
                        href={getBlogPostUrl(post.slug, post.category)}
                        className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-gray-200 hover:bg-white"
                      >
                        <p className="text-sm font-medium text-gray-500">{post.readTime} 읽기</p>
                        <h4 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-gray-900 group-hover:text-[var(--color-primary)] md:line-clamp-3">
                          {post.title}
                        </h4>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-2">{post.excerpt}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                          글 바로 읽기
                          <ArrowRight size={14} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white px-4 pb-6 md:px-6 md:pb-8 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-gray-100 bg-gradient-to-r from-blue-50 to-white p-5 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-none lg:max-w-3xl xl:max-w-4xl">
              <p className="text-sm font-semibold tracking-wide text-[var(--color-gold)] uppercase">
                Next Step
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-gray-900 md:text-3xl">
                읽은 내용을 진료 안내와 함께 정리해 보세요
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 md:text-base">
                {relatedTreatment
                  ? `${relatedTreatment.name} 진료 페이지에서 치료 과정과 상담 포인트를 함께 확인할 수 있습니다.`
                  : "상담 안내 페이지에서 내원 전 준비사항과 연락 방법을 바로 확인할 수 있습니다."}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              {relatedTreatment && (
                <Link
                  href={relatedTreatment.href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 sm:w-auto"
                >
                  <FileText size={16} />
                  {relatedTreatment.name} 진료 안내
                </Link>
              )}
              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
              >
                상담 안내
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CategoryPostList posts={categoryPosts} />

      <div className="h-16 md:hidden" />
    </>
  );
}
