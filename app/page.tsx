import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  ArrowRight,
  Shield,
  Heart,
  Stethoscope,
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

      {/* ───────────── 핵심가치 ───────────── */}
      <section id="values" className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
                Our Values
              </p>
              <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                {CLINIC.name}의 약속
              </h2>
            </FadeIn>

            <StaggerContainer className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "신뢰",
                  desc: "서울대 출신 전문의의 정확한 진단과 치료 계획을 제공합니다.",
                },
                {
                  icon: Heart,
                  title: "정성",
                  desc: "환자분의 불안을 줄이고 편안한 진료 환경을 만들어 드립니다.",
                  gold: true,
                },
                {
                  icon: Stethoscope,
                  title: "전문성",
                  desc: "국내외 학회 활동과 지속적인 연구로 최선의 치료를 제공합니다.",
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow hover:shadow-md">
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${"gold" in item && item.gold ? "bg-[#FDF3E0] text-[var(--color-gold)]" : "bg-blue-100 text-[var(--color-primary)]"}`}>
                      <item.icon size={24} />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">
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
                Reviews
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
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
                      &ldquo;{review.text}&rdquo;
                    </p>

                    {/* 하단: 이름 */}
                    <div className="border-t border-gray-200 pt-4">
                      <span className="text-sm font-medium text-gray-900">{review.name}</span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* 리뷰 남기기 버튼 */}
            {(GOOGLE_REVIEW.writeReviewUrl || NAVER_REVIEW.writeReviewUrl) && (
              <FadeIn className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
                    네이버 리뷰 남기기
                    <ExternalLink size={16} />
                  </a>
                )}
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
                전화 상담 {CLINIC.phone}
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
