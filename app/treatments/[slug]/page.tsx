import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { CLINIC, TREATMENTS } from "@/lib/constants";
import { TREATMENT_DETAILS } from "@/lib/treatments";
import { getTreatmentJsonLd, getFaqJsonLd, getBreadcrumbJsonLd } from "@/lib/jsonld";
import { getRelatedBlogPosts, categoryColors } from "@/lib/blog";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { Clock } from "lucide-react";

export function generateStaticParams() {
  return TREATMENTS.map((t) => ({ slug: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = TREATMENT_DETAILS[slug];
  if (!detail) return {};

  // 스케일링 페이지는 타겟 키워드를 포함한 맞춤 메타데이터 사용
  if (slug === "scaling") {
    return {
      title: "안아픈 스케일링 | 에어플로우 스케일링",
      description:
        "김포 스케일링 잘하는 치과, 서울본치과. 에어플로우를 이용한 편안한 스케일링으로 시린 증상 없이 깨끗하게. 김포한강신도시 장기동 치과, 연 1회 건강보험 적용.",
      keywords: ["안아픈 스케일링", "에어플로우 스케일링", "스케일링 잘하는 치과", "김포 스케일링", "장기동 스케일링"],
    };
  }

  return {
    title: detail.name,
    description: `김포한강신도시 장기동 치과 ${CLINIC.name} ${detail.name} - ${detail.subtitle}. ${detail.description.slice(0, 100)}`,
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

  const treatmentJsonLd = getTreatmentJsonLd(slug);
  const faqJsonLd = detail.faq.length > 0 ? getFaqJsonLd(detail.faq) : null;
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(treatmentJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* 헤더 */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
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
            <h2 className="font-headline mb-10 text-center text-3xl font-bold text-gray-900">
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
                <p className="text-sm leading-relaxed text-gray-600">
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
            <h2 className="font-headline mb-8 text-center text-3xl font-bold text-gray-900">
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
                <span className="text-sm font-medium text-gray-800">
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
              <h2 className="font-headline mb-8 text-center text-3xl font-bold text-gray-900">
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
                  <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 관련 블로그 */}
      {(() => {
        const relatedBlogPosts = getRelatedBlogPosts(slug, 4);
        if (relatedBlogPosts.length === 0) return null;
        const formatDate = (dateStr: string) => {
          const [year, month, day] = dateStr.split("-");
          return `${year}.${month}.${day}`;
        };
        return (
          <section className="section-padding bg-white">
            <div className="container-narrow">
              <FadeIn>
                <div className="mb-10 text-center">
                  <span className="mb-2 inline-block text-sm font-medium text-[var(--color-gold)]">
                    관련 블로그
                  </span>
                  <h2 className="font-headline text-3xl font-bold text-gray-900">
                    {detail.name}에 대해 더 알아보기
                  </h2>
                </div>
              </FadeIn>
              <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {relatedBlogPosts.map((rp) => (
                  <StaggerItem key={rp.id}>
                    <Link href={`/blog/${rp.slug}`} className="block h-full">
                      <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-all hover:border-gray-200 hover:shadow-lg">
                        <span
                          className={`mb-3 w-fit rounded-full px-3 py-1 text-xs font-medium ${categoryColors[rp.category] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {rp.category}
                        </span>
                        <h3 className="mb-1 text-base font-bold leading-snug text-gray-900">
                          {rp.title}
                        </h3>
                        <p className="mb-3 text-sm text-gray-500">
                          {rp.subtitle}
                        </p>
                        <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
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
              <FadeIn className="mt-8 text-center">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  블로그에서 더 많은 글 보기
                  <ArrowRight size={14} />
                </Link>
              </FadeIn>
            </div>
          </section>
        );
      })()}

      {/* CTA */}

      <section className="relative overflow-hidden bg-[var(--color-primary)] px-4 py-16 text-center text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--color-gold)]/10" />
        <h2 className="font-headline relative mb-4 text-2xl font-bold md:text-3xl">
          {detail.name} 상담이 필요하신가요?
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
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-8 py-4 text-base font-medium text-white hover:border-white hover:bg-white/10"
          >
            상담 안내
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
