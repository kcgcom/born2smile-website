import Link from "next/link";
import {
  Phone,
  ArrowRight,
  Clock,
  Shield,
  Heart,
  Stethoscope,
} from "lucide-react";
import { CLINIC, HOURS, TREATMENTS, DOCTORS } from "@/lib/constants";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";


export default function Home() {
  return (
    <>
      {/* ───────────── 히어로 섹션 ───────────── */}
      <section id="hero" className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
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
      </section>

      {/* ───────────── 병원 소개 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow text-center">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              About Us
            </p>
            <h2 className="font-headline mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
              안녕하세요. {CLINIC.name}입니다.
            </h2>
            <div className="mx-auto mb-12 max-w-2xl space-y-4 text-lg leading-relaxed text-gray-600">
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

      {/* ───────────── 의료진 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Doctor
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료진 소개
            </h2>
          </FadeIn>

          {DOCTORS.map((doctor) => (
            <FadeIn key={doctor.id}>
              <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="grid md:grid-cols-2">
                  {/* 사진 영역 (플레이스홀더) */}
                  <div className="flex items-center justify-center bg-gradient-to-br from-[#FDF3E0] to-[#FEF9F0] p-12 md:min-h-[400px]">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#F5E6C8] text-4xl font-bold text-[var(--color-gold-dark)]">
                        {doctor.name.charAt(0)}
                      </div>
                      <p className="text-sm text-gray-500">프로필 사진 영역</p>
                    </div>
                  </div>

                  {/* 정보 영역 */}
                  <div className="p-8 md:p-10">
                    <div className="mb-1 text-sm font-medium text-[var(--color-gold)]">
                      {doctor.title}
                    </div>
                    <h3 className="mb-1 text-2xl font-bold text-gray-900">
                      {doctor.name}
                    </h3>
                    <p className="mb-6 text-sm text-gray-500">
                      {doctor.position}
                    </p>

                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="mb-2 font-bold text-gray-900">학력</h4>
                        <ul className="space-y-1 text-gray-600">
                          {doctor.education.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-2 font-bold text-gray-900">자격</h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>미국 치과의사 자격시험(NBDE) 통과</li>
                          <li>미국치과임플란트학회(AAID) 인정의</li>
                        </ul>
                      </div>
                    </div>

                    <Link
                      href="/about"
                      className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
                    >
                      상세 경력 보기
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ───────────── 진료 분야 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Treatments
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              진료 분야
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TREATMENTS.map((treatment) => (
              <StaggerItem key={treatment.id}>
                <Link
                  href={treatment.href}
                  className="group block rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-all hover:border-[var(--color-primary)] hover:shadow-lg"
                >
                  <h3 className="mb-2 text-xl font-bold text-gray-900 group-hover:text-[var(--color-primary)]">
                    {treatment.name}
                  </h3>
                  <p className="mb-4 text-sm text-gray-600">
                    {treatment.shortDesc}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                    자세히 보기
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── 오시는 길 + 진료시간 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Location
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              오시는 길
            </h2>
          </FadeIn>

          <div className="grid items-stretch gap-8 md:grid-cols-2">
            {/* 카카오맵 */}
            <FadeIn direction="left" className="flex">
              <KakaoMap className="min-h-[300px] w-full flex-1" />
            </FadeIn>

            {/* 병원 정보 */}
            <FadeIn direction="right">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-bold text-gray-900">
                    {CLINIC.name}
                  </h3>
                  <p className="text-gray-600">{CLINIC.address}</p>
                  <a
                    href={CLINIC.phoneHref}
                    className="mt-1 inline-block font-medium text-[var(--color-primary)]"
                  >
                    {CLINIC.phone}
                  </a>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-bold text-gray-900">
                    <Clock size={18} className="mr-2 inline-block" />
                    진료시간
                  </h3>
                  <ul className="max-w-xs space-y-2 text-sm">
                    {HOURS.schedule.map((item) => (
                      <li
                        key={item.day}
                        className="flex items-center justify-between border-b border-gray-100 pb-2"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-gray-700">
                          {item.day}
                          {"note" in item && item.note && (
                            <span className="rounded-full bg-[var(--color-gold)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-gold)]">
                              {item.note}
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            item.open ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {item.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-gray-500">
                    점심시간: {HOURS.lunchTime} | {HOURS.closedDays}
                  </p>
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
