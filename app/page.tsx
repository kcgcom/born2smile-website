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

export default function Home() {
  return (
    <>
      {/* ───────────── 히어로 섹션 ───────────── */}
      <section className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
            경기도 김포시
          </p>
          <h1 className="font-headline mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
            당신의 미소를
            <br />
            디자인합니다
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 md:text-xl">
            서울대 출신 통합치의학전문의가 정성을 다해 진료합니다.
            <br className="hidden md:block" />
            자연치아를 지키는 치료, {CLINIC.name}에서 시작하세요.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              예약하기
              <ArrowRight size={18} />
            </Link>
            <a
              href={CLINIC.phoneHref}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-4 text-base font-medium text-gray-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <Phone size={18} />
              {CLINIC.phone}
            </a>
          </div>
        </div>
      </section>

      {/* ───────────── 병원 소개 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow text-center">
          <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
            About Us
          </p>
          <h2 className="font-headline mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
            {CLINIC.name}을 소개합니다
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-gray-600">
            환자 한 분 한 분의 구강 건강을 최우선으로 생각합니다.
            <br />
            꼭 필요한 진료만, 충분한 설명과 함께 정직하게 진료합니다.
          </p>

          <div className="grid gap-8 md:grid-cols-3">
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
              },
              {
                icon: Stethoscope,
                title: "전문성",
                desc: "국내외 학회 활동과 지속적인 연구로 최선의 치료를 제공합니다.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[var(--color-primary)]">
                  <item.icon size={24} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── 진료 분야 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Treatments
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              진료 분야
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TREATMENTS.map((treatment) => (
              <Link
                key={treatment.id}
                href={treatment.href}
                className="group rounded-2xl border border-gray-100 bg-white p-8 transition-all hover:border-[var(--color-primary)] hover:shadow-lg"
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
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── 의료진 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Doctor
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료진 소개
            </h2>
          </div>

          {DOCTORS.map((doctor) => (
            <div
              key={doctor.id}
              className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
            >
              <div className="grid md:grid-cols-2">
                {/* 사진 영역 (플레이스홀더) */}
                <div className="flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 p-12 md:min-h-[400px]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-blue-200 text-4xl font-bold text-[var(--color-primary)]">
                      {doctor.name.charAt(0)}
                    </div>
                    <p className="text-sm text-gray-500">
                      프로필 사진 영역
                    </p>
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
          ))}
        </div>
      </section>

      {/* ───────────── 오시는 길 + 진료시간 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Location
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              오시는 길
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 지도 플레이스홀더 */}
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
              <p className="text-gray-400">카카오맵 영역</p>
            </div>

            {/* 병원 정보 */}
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
          </div>
        </div>
      </section>

      {/* ───────────── CTA 배너 ───────────── */}
      <section className="bg-[var(--color-primary)] px-4 py-16 text-center text-white md:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline mb-4 text-3xl font-bold md:text-4xl">
            지금 바로 상담 예약하세요
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            건강한 미소를 위한 첫 걸음, {CLINIC.name}이 함께합니다.
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
              <Phone size={18} />
              전화 상담
            </a>
          </div>
        </div>
      </section>

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
