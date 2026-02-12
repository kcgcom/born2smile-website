import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Shield,
} from "lucide-react";
import { CLINIC, HOURS, DOCTORS } from "@/lib/constants";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";

const FEATURED_TREATMENTS = [
  {
    icon: "implant",
    title: "임플란트",
    desc: "자연치아와 가장 유사한 인공치아로, 저작력과 심미성을 동시에 회복합니다.",
    href: "/treatments/implant",
  },
  {
    icon: "orthodontics",
    title: "교정치료",
    desc: "가지런한 치아와 건강한 교합을 위한 맞춤형 교정 치료를 제공합니다.",
    href: "/treatments/orthodontics",
  },
  {
    icon: "preventive",
    title: "예방치료",
    desc: "에어플로우 스케일링과 정기검진으로 치아 건강을 미리 지켜드립니다.",
    href: "/treatments/scaling",
  },
];

function TreatmentIcon({ type }: { type: string }) {
  if (type === "implant") {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="40" height="40" rx="8" fill="#EFF6FF" />
        <path d="M20 10c-2.5 0-4.5 1.8-4.5 4v2c0 1.2.5 2.3 1.3 3.1L18 20.5v1.5h4v-1.5l1.2-1.4c.8-.8 1.3-1.9 1.3-3.1v-2c0-2.2-2-4-4.5-4z" fill="#2563EB" />
        <path d="M18 22h4v2h-4zm.5 4h3l.5 4h-4l.5-4z" fill="#93C5FD" />
      </svg>
    );
  }
  if (type === "orthodontics") {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="40" height="40" rx="8" fill="#EFF6FF" />
        <rect x="12" y="16" width="5" height="7" rx="1.5" fill="#2563EB" />
        <rect x="17.5" y="16" width="5" height="7" rx="1.5" fill="#2563EB" />
        <rect x="23" y="16" width="5" height="7" rx="1.5" fill="#2563EB" />
        <line x1="12" y1="19.5" x2="28" y2="19.5" stroke="#93C5FD" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#EFF6FF" />
      <path d="M20 12l7 4v6c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10v-6l7-4z" fill="#2563EB" />
      <path d="M17.5 20l2 2 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* ───────────── 히어로 섹션 ───────────── */}
      <section className="relative bg-white pt-24 md:pt-0">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 md:min-h-screen md:grid-cols-2 md:px-8">
          {/* 텍스트 영역 */}
          <div className="py-12 md:py-0">
            <FadeIn delay={0.2}>
              <h1 className="font-headline mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
                건강한 미소,
                <br />
                {CLINIC.name}
              </h1>
            </FadeIn>
            <FadeIn delay={0.4}>
              <p className="mb-8 max-w-md text-base leading-relaxed text-gray-600 md:text-lg">
                서울대 출신 통합치의학전문의가 정성을 다해 진료합니다.
                자연치아를 지키는 치료, {CLINIC.name}에서 시작하세요.
              </p>
            </FadeIn>
            <FadeIn delay={0.6}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-8 py-3.5 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
              >
                온라인 예약 바로가기
                <ArrowRight size={18} />
              </Link>
            </FadeIn>
          </div>

          {/* 이미지 영역 */}
          <FadeIn delay={0.4} direction="right">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex aspect-[4/3] items-center justify-center p-12 md:aspect-auto md:min-h-[480px]">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-200/60">
                    <Shield size={36} className="text-[var(--color-primary)]" />
                  </div>
                  <p className="text-sm text-gray-500">진료실 이미지 영역</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ───────────── 진료 안내 ───────────── */}
      <section className="section-padding bg-[var(--background)]">
        <div className="container-narrow">
          <FadeIn className="mb-12">
            <p className="mb-2 text-sm font-medium text-[var(--color-primary)]">
              Treatment
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              진료 안내
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TREATMENTS.map((treatment) => (
              <StaggerItem key={treatment.title}>
                <Link
                  href={treatment.href}
                  className="group block rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-[var(--color-primary)] hover:shadow-lg"
                >
                  <div className="mb-5">
                    <TreatmentIcon type={treatment.icon} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900 group-hover:text-[var(--color-primary)]">
                    {treatment.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {treatment.desc}
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn className="mt-8 text-center">
            <Link
              href="/treatments"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              전체 진료 안내 보기
              <ArrowRight size={14} />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ───────────── 의료진 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <FadeIn className="mb-12">
            <p className="mb-2 text-sm font-medium text-[var(--color-primary)]">
              Doctor
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료진 소개
            </h2>
          </FadeIn>

          {DOCTORS.map((doctor) => (
            <FadeIn key={doctor.id}>
              <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <div className="grid md:grid-cols-2">
                  {/* 사진 영역 */}
                  <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-12 md:min-h-[400px]">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-blue-200/60 text-4xl font-bold text-[var(--color-primary)]">
                        {doctor.name.charAt(0)}
                      </div>
                      <p className="text-sm text-gray-500">프로필 사진 영역</p>
                    </div>
                  </div>

                  {/* 정보 영역 */}
                  <div className="p-8 md:p-10">
                    <div className="mb-1 text-sm font-medium text-[var(--color-primary)]">
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
                        <h4 className="mb-2 font-bold text-gray-900">현직</h4>
                        <ul className="space-y-1 text-gray-600">
                          {doctor.currentPositions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
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

      {/* ───────────── 오시는 길 + 진료시간 ───────────── */}
      <section className="section-padding bg-[var(--background)]">
        <div className="container-narrow">
          <FadeIn className="mb-12">
            <p className="mb-2 text-sm font-medium text-[var(--color-primary)]">
              Location
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              오시는 길
            </h2>
          </FadeIn>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 카카오맵 */}
            <FadeIn direction="left">
              <KakaoMap className="min-h-[300px]" />
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
                  <ul className="space-y-2 text-sm">
                    {HOURS.schedule.map((item) => (
                      <li
                        key={item.day}
                        className="flex justify-between border-b border-gray-100 pb-2"
                      >
                        <span className="font-medium text-gray-700">
                          {item.day}
                        </span>
                        <span
                          className={
                            item.open ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {item.time}
                          {"note" in item && item.note && (
                            <span className="ml-1 text-xs text-[var(--color-accent)]">
                              {item.note}
                            </span>
                          )}
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
      <section className="bg-[var(--color-primary)] px-4 py-16 text-center text-white md:py-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl">
            <h2 className="font-headline mb-4 text-3xl font-bold md:text-4xl">
              지금 바로 상담 예약하세요
            </h2>
            <p className="mb-8 text-lg text-blue-100">
              건강한 미소를 위한 첫걸음, {CLINIC.name}가 함께합니다.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-blue-50"
              >
                온라인 예약
                <ArrowRight size={18} />
              </Link>
              <a
                href={CLINIC.phoneHref}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-8 py-4 text-base font-medium text-white transition-colors hover:border-white hover:bg-white/10"
              >
                전화 상담
              </a>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
