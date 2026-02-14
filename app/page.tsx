import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  ArrowRight,
  Clock,
  Shield,
  Heart,
  Stethoscope,
  GraduationCap,
  Award,
  Users,
  Briefcase,
  MapPin,
} from "lucide-react";
import { CLINIC, HOURS, DOCTORS, SEO, BASE_URL } from "@/lib/constants";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";

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
  const doctor = DOCTORS[0];

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

      {/* ───────────── 인사말 · 핵심가치 ───────────── */}
      <section id="greeting" className="section-padding bg-white">
          <div className="container-narrow">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-headline mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
                  안녕하세요. {CLINIC.name}입니다.
                </h2>
                <div className="space-y-4 text-lg leading-relaxed text-gray-600">
                  <p>
                    {CLINIC.name}는 환자분 한 분 한 분의 구강건강을 최우선으로 생각합니다.
                    <br />
                    꼭 필요한 진료만 정직하게 진료하겠습니다.
                  </p>
                  <p>
                    충분히 듣고, 충분히 설명하겠습니다.
                    <br />
                    환자분이 불안하지 않도록 불편하지 않도록 주의깊게 진료하겠습니다.
                  </p>
                  <p>
                    자연치아를 최대한 보존하는 것을 원칙으로
                    <br />
                    환자분께서 건강한 미소를 되찾으실때까지 함께하겠습니다.
                  </p>
                </div>
              </div>
            </FadeIn>

            <StaggerContainer className="mt-16 grid gap-8 md:grid-cols-3">
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

      {/* ───────────── 의료진 소개 ───────────── */}
      <section id="doctor" className="section-padding bg-gray-50">
          <div className="container-narrow">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
                Doctor
              </p>
              <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
                의료진 소개
              </h2>
            </FadeIn>

            <div className="mx-auto max-w-5xl">
              {/* 프로필 상단 */}
              <div className="mb-10 grid items-center gap-8 md:grid-cols-3">
                <div className="flex items-center justify-center">
                  <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-[#FDF3E0] to-[#FEF9F0] text-6xl font-bold text-[var(--color-gold-dark)]">
                    {doctor.name.charAt(0)}
                  </div>
                </div>
                <div className="text-center md:col-span-2 md:text-left">
                  <p className="text-sm font-medium text-[var(--color-gold)]">
                    {doctor.title}
                  </p>
                  <h3 className="mt-1 text-3xl font-bold text-gray-900">
                    {doctor.name}
                  </h3>
                  <p className="mt-1 text-gray-500">{doctor.position}</p>
                </div>
              </div>

              {/* 경력 그리드 */}
              <StaggerContainer className="grid gap-6 md:grid-cols-2">
                {/* 학력 */}
                <StaggerItem className="rounded-2xl border border-gray-100 bg-white p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <GraduationCap
                      size={20}
                      className="text-[var(--color-primary)]"
                    />
                    학력
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {doctor.education.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </StaggerItem>

                {/* 자격 및 수료 */}
                <StaggerItem className="rounded-2xl border border-gray-100 bg-white p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Award
                      size={20}
                      className="text-[var(--color-gold)]"
                    />
                    자격 및 수료
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {doctor.credentials.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </StaggerItem>

                {/* 학회 활동 */}
                <StaggerItem className="rounded-2xl border border-gray-100 bg-white p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Users
                      size={20}
                      className="text-[var(--color-primary)]"
                    />
                    학회 활동
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {doctor.memberships.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </StaggerItem>

                {/* 현직 */}
                <StaggerItem className="rounded-2xl border border-gray-100 bg-white p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Briefcase
                      size={20}
                      className="text-[var(--color-primary)]"
                    />
                    현직
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {doctor.currentPositions.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </div>
      </section>

      {/* TODO: 시설 안내 섹션 — 실제 시설 사진 준비 후 활성화 */}

      {/* ───────────── 진료시간 + 오시는 길 ───────────── */}
      <section id="info" className="section-padding bg-gray-50">
          <div className="container-narrow">
            <div className="grid gap-10 md:grid-cols-2">
              {/* 진료시간 */}
              <FadeIn direction="left">
                <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <Clock size={24} className="text-[var(--color-gold)]" />
                  진료시간
                </h2>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  <table className="w-full text-sm">
                    <tbody>
                      {HOURS.schedule.map((item) => (
                        <tr
                          key={item.day}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-5 py-3 font-medium text-gray-700">
                            {item.day}
                          </td>
                          <td
                            className={`px-5 py-3 text-right ${item.open ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {item.time}
                            {"note" in item && item.note && (
                              <span className="ml-2 rounded-full bg-[#FDF3E0] px-2 py-0.5 text-xs text-[var(--color-gold-dark)]">
                                {item.note}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500">
                    점심시간: {HOURS.lunchTime} | {HOURS.closedDays}
                    <br />
                    {HOURS.notice}
                  </div>
                </div>
              </FadeIn>

              {/* 오시는 길 */}
              <FadeIn direction="right">
                <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <MapPin size={24} className="text-[var(--color-primary)]" />
                  오시는 길
                </h2>
                <KakaoMap className="mb-6 aspect-[4/3]" />
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                    />
                    <span className="text-gray-700">{CLINIC.address}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                    />
                    <a
                      href={CLINIC.phoneHref}
                      className="font-medium text-[var(--color-primary)]"
                    >
                      {CLINIC.phone}
                    </a>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
      </section>

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
