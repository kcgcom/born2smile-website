import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Star,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { CLINIC, DOCTORS, SEO, BASE_URL, REVIEWS, GOOGLE_REVIEW, NAVER_REVIEW, STAFF } from "@/lib/constants";
import { TREATMENT_DETAILS } from "@/lib/treatments";
import { getFaqJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { CTABanner } from "@/components/ui/CTABanner";

// 홈페이지에 노출할 자주 묻는 질문 (각 진료 분야에서 선별)
const HOMEPAGE_FAQ = [
  TREATMENT_DETAILS.implant.faq[0],     // 임플란트 수술은 아프나요?
  TREATMENT_DETAILS.implant.faq[1],     // 임플란트 수명은 얼마나 되나요?
  TREATMENT_DETAILS.orthodontics.faq[0], // 성인도 교정이 가능한가요?
  TREATMENT_DETAILS.pediatric.faq[0],    // 아이가 처음 치과에 가는 시기는?
  TREATMENT_DETAILS.restorative.faq[0],  // 신경치료는 아프나요?
  TREATMENT_DETAILS.scaling.faq[0],      // 스케일링이 아프지 않나요?
];

export const metadata: Metadata = {
  title: SEO.defaultTitle,
  description: SEO.defaultDescription,
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: SEO.defaultTitle,
    description: SEO.ogDescription,
    siteName: CLINIC.name,
    locale: "ko_KR",
    type: "website",
    url: BASE_URL,
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
    title: SEO.defaultTitle,
    description: SEO.ogDescription,
    images: ["/images/og-image.jpg"],
  },
};

export default function Home() {
  return (
    <>
      {/* ───────────── 히어로 섹션 ───────────── */}
      <section id="hero">
        <div className="relative flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <p className="mb-4 text-base font-medium tracking-widest text-[var(--color-gold)] uppercase md:text-lg">
              우리가족 평생주치의
            </p>
            <h1 className="font-headline mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              꼭! 필요한 치료만
              <br />
              오래오래 편안하게
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 md:text-xl">
              서울대 출신의 전문의가 정성을 다해 진료합니다.{" "}
              <br />
              자연치아를 지키는 치료, 서울본치과에서 시작하세요.
            </p>
            <FadeIn delay={0.3}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
              >
                상담 안내
                <ArrowRight size={18} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ───────────── 인사말 (편지 스타일) ───────────── */}
      <section id="greeting" className="section-padding bg-white">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <p className="mb-2 text-center text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Greeting
            </p>
            <h2 className="mb-6 text-center font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              인사말
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="greeting-letter">
              {/* 골드 상단 라인 */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold-light)] to-transparent" />

              <div className="px-6 py-10 sm:px-10 md:px-14 md:py-14">
                {/* 본문 */}
                <div className="font-greeting font-bold space-y-5 text-lg leading-[1.9] text-gray-700 md:text-xl md:leading-[2]">
                  <p>안녕하세요, {CLINIC.name}입니다.</p>
                  <p>
                    치과가 편한 곳이 되면 좋겠습니다. 오래 미뤄두었던 치료도
                    부담 없이 꺼내놓을 수 있고, 궁금한 것은 무엇이든 물어볼 수
                    있는 곳. {CLINIC.name}가 그런 곳이 되고 싶습니다.
                  </p>
                  <p>
                    눈앞의 이익보다, 환자분의 건강한 치아가 저희에게는 더
                    소중합니다. 임플란트 치료도 잘하지만, 스케일링 잘하는
                    치과, 신경치료 잘하는 치과로 칭찬받고 싶습니다.
                  </p>
                  <p>
                    빠르고 저렴한 치료가 주목받는 시대이지만, 느리더라도 꼼꼼한
                    치료, 정석대로 하는 치료를 하는 치과가 동네마다 하나쯤은
                    있어야 한다고 믿습니다.
                  </p>
                  <p>
                    치료를 받지 않으셔도 괜찮습니다. 궁금한 게 있으시면
                    언제든 편하게 찾아와 주세요. 충분히 듣고, 함께
                    고민하겠습니다.
                  </p>
                  <p>
                    찾아주시는 한 분 한 분께 감사드리며, 그 믿음에 정성으로
                    보답하겠습니다.
                  </p>
                </div>

                {/* 서명 */}
                <div className="mt-10 text-right">
                  <div className="inline-block text-right">
                    <p className="font-greeting font-bold text-base text-gray-600 md:text-lg">
                      {CLINIC.name}
                    </p>
                    <p className="font-greeting mt-1 text-lg font-bold text-gray-800 md:text-xl">
                      원장 {DOCTORS[0].name} 드림
                    </p>
                  </div>
                </div>
              </div>

              {/* 골드 하단 라인 */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold-light)] to-transparent" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ───────────── 6가지 약속 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Our Promise
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              {CLINIC.name}의 6가지 약속
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "\u201C안 해도 됩니다\u201D",
                desc: "필요하지 않은 치료는 권하지 않겠습니다. \"이건 치료 안 하셔도 됩니다\"라고 솔직하게 말씀드리겠습니다.",
              },
              {
                num: "02",
                title: "궁금한 건 다 물어보세요",
                desc: "충분히 듣겠습니다. 함께 고민하겠습니다. 환자분이 이해하실때까지 충분히 설명하겠습니다.",
              },
              {
                num: "03",
                title: "아프지 않게, 무섭지 않게",
                desc: "최신 마취 기법과 무통마취기를 사용합니다. 치료 과정의 통증과 불안을 최소화하겠습니다.",
              },
              {
                num: "04",
                title: "약속한 시간, 지킵니다",
                desc: "예약 시스템을 철저히 운영하여 환자분의 소중한 시간을 존중하겠습니다.",
              },
              {
                num: "05",
                title: "보이지 않는 곳까지",
                desc: "1인 1기구 사용원칙과 철저한 멸균소독으로 서울대학교병원 수준의 감염관리를 실천합니다.",
              },
              {
                num: "06",
                title: "한 번 인연, 평생 주치의",
                desc: "치료 후에도 정기 검진과 관리로 끝까지 책임집니다. 평생 주치의가 되겠습니다.",
              },
            ].map((item) => (
              <StaggerItem key={item.num}>
                <div className="relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-7 transition-shadow hover:shadow-md">
                  <span className="absolute top-5 right-5 font-headline text-3xl font-bold text-[var(--color-gold)]/25">
                    {item.num}
                  </span>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-base leading-relaxed text-gray-700">
                    {item.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── 면허 치과위생사 신뢰 배너 ───────────── */}
      <section className="bg-white px-4 py-12 md:py-16">
        <FadeIn>
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-[var(--color-gold)]/20 bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-primary)]/5 px-6 py-8 text-center md:flex-row md:gap-6 md:px-10 md:text-left">
            <ShieldCheck
              size={36}
              className="shrink-0 text-[var(--color-gold)]"
            />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                {STAFF.credential} 전원 보유
              </h3>
              <p className="mt-1 text-base leading-relaxed text-gray-700">
                {STAFF.summary}
              </p>
            </div>
            <Link
              href="/about#our-team"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-dark)]"
            >
              의료진 소개 보기
              <ArrowRight size={14} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ───────────── 환자분들의 이야기 ───────────── */}
      {REVIEWS.length > 0 && (
        <section id="reviews" className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
                Testimonials
              </p>
              <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                환자분들의 이야기
              </h2>
              <p className="mt-4 text-gray-600">
                {CLINIC.name}에서 치료받으신 분들의 소중한 후기입니다.
              </p>
            </FadeIn>

            <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {REVIEWS.map((review, index) => (
                <StaggerItem key={index}>
                  <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-shadow hover:shadow-md">
                    {/* 별점 */}
                    <div className="mb-3 flex items-center gap-1" role="img" aria-label={`${review.rating}점 만점에 5점`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < review.rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    {/* 후기 내용 */}
                    <p className="mb-4 flex-1 text-base leading-relaxed text-gray-700">
                      &ldquo;{review.text}&rdquo;
                    </p>

                    {/* 하단: 이름 + 출처 */}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <span className="text-sm font-medium text-gray-900">{review.name}</span>
                      {review.source === "naver" ? (
                        <span className="flex items-center gap-1 text-sm text-[#03C75A]">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M13.27 10.6L6.49 1H1v18h5.73V9.4L13.51 19H19V1h-5.73z" />
                          </svg>
                          네이버
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-[#4285F4]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Google
                        </span>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* 리뷰 남기기 버튼 */}
            {(GOOGLE_REVIEW.writeReviewUrl || NAVER_REVIEW.writeReviewUrl) && (
              <FadeIn className="mt-12">
                <div className="rounded-2xl bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-primary)]/6 border border-[var(--color-gold)]/15 px-6 py-8 text-center md:px-10 md:py-10">
                  <h3 className="font-headline mb-2 text-xl font-bold text-gray-900 md:text-2xl">
                    치료에 만족하셨나요?
                  </h3>
                  <p className="mb-6 text-base leading-relaxed text-gray-600">
                    소중한 후기가 다른 분들에게 큰 도움이 됩니다.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                  {GOOGLE_REVIEW.writeReviewUrl && (
                    <a
                      href={GOOGLE_REVIEW.writeReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[#4285F4] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3367D6] hover:shadow-md"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.8" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.6" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.9" />
                      </svg>
                      Google 리뷰 남기기
                      <span className="sr-only"> (새 창)</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {NAVER_REVIEW.writeReviewUrl && (
                    <a
                      href={NAVER_REVIEW.writeReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[#03C75A] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#02b351] hover:shadow-md"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M13.27 10.6L6.49 1H1v18h5.73V9.4L13.51 19H19V1h-5.73z" />
                      </svg>
                      Naver 리뷰 남기기
                      <span className="sr-only"> (새 창)</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </section>
      )}

      {/* ───────────── 자주 묻는 질문 ───────────── */}
      <section id="faq" className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              FAQ
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              자주 묻는 질문
            </h2>
            <p className="mt-4 text-gray-600">
              환자분들이 자주 궁금해하시는 질문을 모았습니다.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <FaqAccordion items={HOMEPAGE_FAQ} />
          </FadeIn>
          <FadeIn delay={0.3} className="mt-8 text-center">
            <Link
              href="/treatments"
              className="inline-flex items-center gap-2 text-base font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-dark)]"
            >
              진료 안내에서 더 알아보기
              <ArrowRight size={16} />
            </Link>
          </FadeIn>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getFaqJsonLd(HOMEPAGE_FAQ)),
          }}
        />
      </section>

      {/* ───────────── CTA 배너 ───────────── */}
      <CTABanner
        heading="지금 바로 상담하세요"
        description={`건강한 미소를 위한 첫걸음, ${CLINIC.name}가 함께합니다.`}
      />

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
