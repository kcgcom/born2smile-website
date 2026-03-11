import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CLINIC, TREATMENTS, BASE_URL } from "@/lib/constants";
import { TREATMENT_DETAILS, RELATED_TREATMENTS } from "@/lib/treatments";
import { getTreatmentJsonLd, getFaqJsonLd, getBreadcrumbJsonLd, getHowToJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { TREATMENT_CATEGORY_MAP, categoryColors, getBlogPostUrl } from "@/lib/blog";
import { getRelatedPosts } from "@/lib/blog-supabase";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { CTABanner } from "@/components/ui/CTABanner";
import { formatDate } from "@/lib/format";
import { Clock } from "lucide-react";

export function generateStaticParams() {
  return TREATMENTS.map((t) => ({ slug: t.id }));
}

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

  const expanded = `${normalized} 진료 전 체크포인트와 치료 후 관리 기준, 재내원 시점까지 함께 확인해 보세요.`;

  if (expanded.length > META_DESCRIPTION_MAX) {
    return `${expanded.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  return expanded;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = TREATMENT_DETAILS[slug];
  if (!detail) return {};

  const treatmentUrl = `${BASE_URL}/treatments/${slug}`;

  // 스케일링 페이지는 타겟 키워드를 포함한 맞춤 메타데이터 사용
  if (slug === "scaling") {
    const scalingOgTitle = `안아픈 스케일링 | 에어플로우 스케일링 | ${CLINIC.name}`;
    const scalingDesc = fitMetaDescription(
      "에어플로우를 활용해 시림과 통증 부담을 줄이고 착색·치태를 부드럽게 제거하는 스케일링 정보를 제공합니다. 김포 한강신도시 장기동 서울본치과에서 건강보험 적용 기준, 권장 주기, 시술 전후 주의사항과 홈케어 관리법까지 자세히 안내합니다. 정기 검진과 예방치료 계획 수립에 도움이 됩니다.",
    );
    const scalingPageDesc = fitMetaDescription(
      `김포 스케일링 잘하는 치과, ${CLINIC.name}. ${scalingDesc}`,
    );
    return {
      title: "안아픈 스케일링 | 에어플로우 스케일링",
      description: scalingPageDesc,
      keywords: ["안아픈 스케일링", "에어플로우 스케일링", "스케일링 잘하는 치과", "김포 스케일링", "장기동 스케일링"],
      alternates: { canonical: treatmentUrl },
      openGraph: {
        title: scalingOgTitle,
        description: scalingDesc,
        siteName: CLINIC.name,
        locale: "ko_KR",
        url: treatmentUrl,
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
        title: scalingOgTitle,
        description: scalingDesc,
        images: ["/images/og-image.jpg"],
      },
    };
  }

  const description = fitMetaDescription(
    `김포 ${detail.name} 잘하는 치과, ${CLINIC.name}. ${detail.subtitle}. ${detail.description.slice(0, 70)} 치료 대상과 과정, 통증 관리, 내원 전후 주의사항까지 자세히 안내합니다.`,
  );
  const ogTitle = `김포 ${detail.name} | ${CLINIC.name}`;

  return {
    title: `김포 ${detail.name}`,
    description,
    keywords: [`김포 ${detail.name}`, `장기동 ${detail.name}`, `한강신도시 ${detail.name}`, `${detail.name} 잘하는 치과`, `김포 ${detail.name} 추천`],
    alternates: { canonical: treatmentUrl },
    openGraph: {
      title: ogTitle,
      description,
      siteName: CLINIC.name,
      locale: "ko_KR",
      url: treatmentUrl,
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
      description,
      images: ["/images/og-image.jpg"],
    },
  };
}

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = TREATMENT_DETAILS[slug];
  if (!detail) notFound();

  const blogCategory = TREATMENT_CATEGORY_MAP[slug];
  const relatedBlogPosts = blogCategory
    ? await getRelatedPosts(blogCategory, slug, 4)
    : [];

  const treatmentJsonLd = getTreatmentJsonLd(slug);
  const faqJsonLd = detail.faq.length > 0 ? getFaqJsonLd(detail.faq) : null;
  const howToJsonLd = getHowToJsonLd(slug);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "진료 안내", href: "/treatments" },
    { name: detail.name, href: `/treatments/${slug}` },
  ]);

  return (
    <>
      {treatmentJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(treatmentJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(howToJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* 헤더 */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <FadeIn>
            <Link
              href="/treatments"
              className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--color-primary)]"
            >
              <ArrowLeft size={14} />
              진료 안내
            </Link>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              {detail.name}
            </h1>
            <p className="mt-3 text-lg text-gray-600">{detail.subtitle}</p>
          </FadeIn>
        </div>
      </section>

      {/* 설명 */}
      <section className="section-padding bg-white">
        <FadeIn className="mx-auto max-w-3xl">
          <p className="text-lg leading-relaxed text-gray-700">
            {detail.description}
          </p>
        </FadeIn>
      </section>

      {/* 치료 과정 */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn>
            <h2 className="font-headline mb-10 text-center text-3xl font-bold text-gray-900 md:text-4xl">
              치료 과정
            </h2>
          </FadeIn>
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {detail.steps.map((step, i) => (
              <StaggerItem key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed text-gray-700">
                  {step.desc}
                </p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 장점 */}
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <h2 className="font-headline mb-8 text-center text-3xl font-bold text-gray-900 md:text-4xl">
              장점
            </h2>
          </FadeIn>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2">
            {detail.advantages.map((adv) => (
              <StaggerItem
                key={adv}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDF3E0] text-sm text-[var(--color-gold)]">
                  ✓
                </span>
                <span className="text-base font-medium text-gray-800">
                  {adv}
                </span>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FAQ */}
      {detail.faq.length > 0 && (
        <section className="section-padding bg-gray-50">
          <div className="mx-auto max-w-3xl">
            <FadeIn>
              <h2 className="font-headline mb-8 text-center text-3xl font-bold text-gray-900 md:text-4xl">
                자주 묻는 질문
              </h2>
            </FadeIn>
            <div className="space-y-4">
              {detail.faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-gray-100 bg-white"
                >
                  <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-gray-900">
                    {item.q}
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-gray-400 transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <div className="border-t border-gray-100 px-5 py-4 text-base leading-relaxed text-gray-700">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 관련 진료 */}
      {RELATED_TREATMENTS[slug] && (
        <section className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn>
              <div className="mb-10 text-center">
                <span className="mb-2 inline-block text-sm font-medium text-[var(--color-gold)]">
                  관련 진료
                </span>
                <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                  함께 알아보면 좋은 진료
                </h2>
              </div>
            </FadeIn>
            <StaggerContainer className="grid gap-6 sm:grid-cols-3">
              {RELATED_TREATMENTS[slug].map((rel) => {
                const t = TREATMENTS.find((tr) => tr.id === rel.id);
                if (!t) return null;
                return (
                  <StaggerItem key={rel.id}>
                    <Link href={t.href} className="block h-full">
                      <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-blue-200 hover:shadow-lg">
                        <h3 className="mb-2 text-lg font-bold text-gray-900">
                          {t.name}
                        </h3>
                        <p className="mb-3 text-sm text-gray-500">
                          {t.shortDesc}
                        </p>
                        <p className="mt-auto text-sm leading-relaxed text-gray-700">
                          {rel.reason}
                        </p>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* 관련 블로그 */}
      {relatedBlogPosts.length > 0 && (
        <section className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn>
              <div className="mb-10 text-center">
                <span className="mb-2 inline-block text-sm font-medium text-[var(--color-gold)]">
                  관련 칼럼
                </span>
                <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                  {detail.name}에 대해 더 알아보기
                </h2>
              </div>
            </FadeIn>
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedBlogPosts.map((rp) => (
                <StaggerItem key={rp.slug}>
                  <Link href={getBlogPostUrl(rp.slug, rp.category)} className="block h-full">
                    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-gray-200 hover:shadow-lg">
                      <span
                        className={`mb-3 w-fit rounded-full px-3 py-1 text-sm font-medium ${categoryColors[rp.category] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {rp.category}
                      </span>
                      <h3 className="mb-1 text-base font-bold leading-snug text-gray-900">
                        {rp.title}
                      </h3>
                      <p className="mb-3 text-sm text-gray-500">
                        {rp.subtitle}
                      </p>
                      <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
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
            <FadeIn className="mt-8 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                건강칼럼에서 더 많은 글 보기
                <ArrowRight size={14} />
              </Link>
            </FadeIn>
          </div>
        </section>
      )}

      {/* CTA */}
      <CTABanner
        heading={`${detail.name} 상담이 필요하신가요?`}
        description={`${CLINIC.name}에서 정확한 진단과 맞춤 치료를 받으세요.`}
      />

      <div className="h-16 md:hidden" />
    </>
  );
}
