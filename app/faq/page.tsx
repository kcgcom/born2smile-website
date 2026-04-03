import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CLINIC, TREATMENTS, BASE_URL } from "@/lib/constants";
import { TREATMENT_DETAILS } from "@/lib/treatments";
import { getFaqJsonLd, getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { CTABanner } from "@/components/ui/CTABanner";

export const metadata: Metadata = {
  title: "자주 묻는 질문 (FAQ)",
  description: `김포 치과 자주 묻는 질문을 진료과목별로 모았습니다. 임플란트·치아교정·보철·소아치료·충치치료·스케일링 상담에서 자주 묻는 비용, 통증, 치료기간, 보험 적용, 내원 주의사항과 관리법을 ${CLINIC.name} 기준으로 알기 쉽게 정리했습니다. 초진 환자와 보호자가 꼭 알아야 할 핵심만 담았습니다.`,
  keywords: [
    "치과 자주 묻는 질문",
    "임플란트 궁금한점",
    "치아교정 FAQ",
    "김포 치과 FAQ",
    "스케일링 자주 묻는 질문",
  ],
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    title: `자주 묻는 질문 | ${CLINIC.name}`,
    description: `김포 치과 자주 묻는 질문 — 임플란트, 교정, 보철, 소아, 충치, 스케일링 FAQ`,
    siteName: CLINIC.name,
    locale: "ko_KR",
    url: `${BASE_URL}/faq`,
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: CLINIC.name,
      },
    ],
  },
};

// 모든 진료 과목의 FAQ를 수집
const TREATMENT_ORDER = ["implant", "orthodontics", "prosthetics", "pediatric", "restorative", "scaling"] as const;

export default function FaqPage() {
  const allFaq = TREATMENT_ORDER.flatMap((id) => {
    const detail = TREATMENT_DETAILS[id];
    if (!detail) return [];
    return detail.faq.map((item) => ({ ...item, treatmentId: id, treatmentName: detail.name }));
  });

  const faqJsonLd = getFaqJsonLd(allFaq);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "자주 묻는 질문", href: "/faq" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* 헤더 */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <FadeIn>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              자주 묻는 질문
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              진료 과목별로 궁금한 점을 확인하세요
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ 섹션 — 진료 과목별 그룹 */}
      {TREATMENT_ORDER.map((id) => {
        const detail = TREATMENT_DETAILS[id];
        if (!detail || detail.faq.length === 0) return null;
        const treatment = TREATMENTS.find((t) => t.id === id);

        return (
          <section key={id} className="section-padding odd:bg-gray-50 even:bg-white">
            <div className="mx-auto max-w-3xl">
              <FadeIn>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-headline text-2xl font-bold text-gray-900 md:text-3xl">
                    {detail.name}
                  </h2>
                  {treatment && (
                    <Link
                      href={treatment.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                    >
                      진료 안내
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </FadeIn>
              <StaggerContainer className="space-y-4">
                {detail.faq.map((item) => (
                  <StaggerItem key={item.q}>
                    <details className="group rounded-2xl border border-gray-100 bg-white">
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
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <CTABanner
        heading="더 궁금한 점이 있으신가요?"
        description={`${CLINIC.name}에서 1:1 맞춤 상담을 받으세요.`}
        pageType="faq"
      />

      <div className="h-16 md:hidden" />
    </>
  );
}
