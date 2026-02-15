import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  ArrowRight,
  Star,
  ExternalLink,
} from "lucide-react";
import { CLINIC, SEO, BASE_URL, REVIEWS, GOOGLE_REVIEW, NAVER_REVIEW } from "@/lib/constants";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: SEO.defaultTitle,
  description: SEO.defaultDescription,
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    url: BASE_URL,
  },
};

export default function Home() {
  return (
    <>
      {/* ───────────── 히어로 섹션 ───────────── */}
      <section id="hero">
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <FadeIn delay={0.2}>
              <p className="mb-4 text-base font-medium tracking-widest text-[var(--color-gold)] uppercase md:text-lg">
                우리가족 평생주치의
              </p>
            </FadeIn>
            <FadeIn delay={0.4}>
              <h1 className="font-headline mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
                꼭! 필요한 치료만
                <br />
                오래오래 편안하게
              </h1>
            </FadeIn>
            <FadeIn delay={0.6}>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 md:text-xl">
                서울대 출신의 전문의가 정성을 다해 진료합니다.{" "}
                <br />
                자연치아를 지키는 치료, 서울본치과에서 시작하세요.
              </p>
            </FadeIn>
            <FadeIn delay={0.8}>
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

      {/* ───────────── 인사말 ───────────── */}
      <section id="greeting" className="section-padding bg-white">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              About Us
            </p>
            <h2 className="font-headline mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
              인사말
            </h2>
            <p className="text-lg leading-relaxed text-gray-600">
              안녕하세요, {CLINIC.name}입니다.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              {CLINIC.name}는 환자분 한 분 한 분의 구강 건강을 최우선으로
              생각합니다. 꼭 필요한 진료만, 충분한 설명과 함께 정직하게
              진료하겠습니다.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              자연치아를 최대한 보존하는 것을 원칙으로, 환자분께서 건강한 미소를
              되찾으실 때까지 함께하겠습니다.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ───────────── 핵심가치 ───────────── */}
      <section id="values" className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
                Our Values
              </p>
              <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                {CLINIC.name}의 핵심가치
              </h2>
            </FadeIn>

            <StaggerContainer className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "신뢰",
                  desc: "서울대 출신 전문의의 정확한 진단과 치료 계획을 제공합니다.",
                },
                {
                  title: "정성",
                  desc: "환자분의 불안을 줄이고 편안한 진료 환경을 만들어 드립니다.",
                  gold: true,
                },
                {
                  title: "전문성",
                  desc: "국내외 학회 활동과 지속적인 연구로 최선의 치료를 제공합니다.",
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow hover:shadow-md">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
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
                    <div className="mb-3 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < review.rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}
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
              <FadeIn className="mt-10 text-center">
                <h3 className="font-headline mb-2 text-xl font-bold text-gray-900 md:text-2xl">
                  치료에 만족하셨나요?
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  소중한 리뷰를 남겨주시면 다른 분들에게 큰 도움이 됩니다.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                {GOOGLE_REVIEW.writeReviewUrl && (
                  <a
                    href={GOOGLE_REVIEW.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                  >
                    Google 리뷰 남기기
                    <ExternalLink size={16} />
                  </a>
                )}
                {NAVER_REVIEW.writeReviewUrl && (
                  <a
                    href={NAVER_REVIEW.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[#03C75A] px-6 py-3 text-sm font-medium text-[#03C75A] transition-colors hover:bg-[#03C75A] hover:text-white"
                  >
                    Naver 리뷰 남기기
                    <ExternalLink size={16} />
                  </a>
                )}
                </div>
              </FadeIn>
            )}
          </div>
        </section>
      )}

      {/* ───────────── CTA 배너 ───────────── */}
      <section className="relative overflow-hidden bg-[var(--color-primary)] px-4 py-16 text-center text-white md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--color-gold)]/10" />
        <FadeIn>
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-headline mb-4 text-3xl font-bold md:text-4xl">
              지금 바로 상담하세요
            </h2>
            <p className="mb-8 text-lg text-blue-100">
              건강한 미소를 위한 첫걸음, {CLINIC.name}가 함께합니다.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-blue-50"
              >
                상담 문의
                <ArrowRight size={18} />
              </Link>
              <a
                href={CLINIC.phoneHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-blue-50"
              >
                <Phone size={18} />
                {CLINIC.phone}
              </a>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ───────────── 골드 구분선 ───────────── */}
      <div className="h-1 bg-gradient-to-r from-[var(--color-gold-light)] via-[var(--color-gold)] to-[var(--color-gold-light)]" />

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
