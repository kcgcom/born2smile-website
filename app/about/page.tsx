import type { Metadata } from "next";
import Image from "next/image";
import {
  GraduationCap,
  Award,
  Users,
  Briefcase,
  Clock,
  MapPin,
  Phone,
} from "lucide-react";
import { CLINIC, DOCTORS, HOURS, BASE_URL } from "@/lib/constants";
import { getBreadcrumbJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";


export const metadata: Metadata = {
  title: "병원 소개",
  description: `${CLINIC.name} - 김포한강신도시 장기동 치과의원. 김포한강신도시 장기동 치과. 서울대 출신 통합치의학전문의 김창균 원장이 정성을 다해 진료합니다.`,
  alternates: { canonical: `${BASE_URL}/about` },
};

export default function AboutPage() {
  const doctor = DOCTORS[0];

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "병원 소개", href: "/about" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* ───────────── 히어로 ───────────── */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <p className="sr-only">About Us</p>
          <h1 className="sr-only">병원 소개</h1>
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
                desc: "철저한 멸균 소독과 수질관리로 서울대학교병원 수준의 감염 관리를 실천합니다.",
              },
              {
                num: "06",
                title: "한 번 인연, 평생 주치의",
                desc: "치료 후에도 정기 검진과 관리로 끝까지 책임집니다. 평생 주치의가 되겠습니다.",
              },
            ].map((item) => (
              <StaggerItem key={item.num}>
                <div className="relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-7 transition-shadow hover:shadow-md">
                  <span className="absolute top-5 right-5 font-headline text-3xl font-bold text-gray-100">
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

      {/* ───────────── 의료진 상세 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Doctor
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료진 소개
            </h2>
          </FadeIn>

          <div className="mx-auto max-w-5xl">
            {/* 프로필 상단 — 프로필 사진 준비 시 grid + 사진 영역 복원 */}
            <div className="mb-10">
              <div className="text-center">
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
                <ul className="space-y-2 text-base text-gray-700">
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
                <ul className="space-y-2 text-base text-gray-700">
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
                <ul className="space-y-2 text-base text-gray-700">
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
                <ul className="space-y-2 text-base text-gray-700">
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

      {/* ───────────── 시설 안내 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Facility
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              시설 안내
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "진료실", src: "/images/facility/treatment-room.jpg" },
              { name: "대기실", src: "/images/facility/waiting-room.jpg" },
              { name: "상담실", src: "/images/facility/consultation-room.jpg" },
              { name: "VIP실", src: "/images/facility/vip-room.jpg" },
              { name: "X-ray실", src: "/images/facility/xray-room.jpg" },
              { name: "외관", src: "/images/facility/exterior.jpg" },
            ].map((item) => (
              <StaggerItem key={item.name}>
                <div className="group relative overflow-hidden rounded-2xl">
                  <Image
                    src={item.src}
                    alt={`${CLINIC.name} ${item.name}`}
                    width={600}
                    height={450}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── 진료시간 + 오시는 길 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="grid gap-10 md:grid-cols-2">
            {/* 진료시간 */}
            <div>
              <h2 className="font-headline mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Clock size={24} className="text-[var(--color-gold)]" />
                진료시간
              </h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-base">
                  <tbody>
                    {HOURS.schedule.map((item) => (
                      <tr
                        key={item.day}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {item.day}
                          {"note" in item && item.note && (
                            <span className="ml-2 rounded-full bg-[#FDF3E0] px-2 py-0.5 text-sm text-[var(--color-gold-dark)]">
                              {item.note}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-5 py-3 text-right ${item.open ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {item.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                  점심시간: {HOURS.lunchTime} | {HOURS.closedDays}
                  <br />
                  {HOURS.notice}
                </div>
              </div>
            </div>

            {/* 오시는 길 */}
            <div>
              <h2 className="font-headline mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <MapPin size={24} className="text-[var(--color-primary)]" />
                오시는 길
              </h2>

              {/* 카카오맵 */}
              <KakaoMap className="mb-6 aspect-[4/3]" />

              <div className="space-y-3 text-base">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                  />
                  <div>
                    <span className="text-gray-700">{CLINIC.address}</span>
                    <p className="mt-1 text-sm text-gray-500">
                      한강센트럴자이 아파트 101동 대각선
                      <br />
                      커피빈(김포장기DT점) 맞은편
                    </p>
                  </div>
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
            </div>
          </div>
        </div>
      </section>

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
