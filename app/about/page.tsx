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
  ShieldCheck,
  MessageCircle,
  Smile,
  Timer,
  Sparkles,
  HeartHandshake,
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
          <h1 className="sr-only">병원소개</h1>
          <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
            About Us
          </p>
          <h2 className="font-headline mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
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
                icon: ShieldCheck,
                title: "과잉진료 ZERO",
                desc: "필요하지 않은 치료는 권하지 않겠습니다. \"이건 치료 안 하셔도 됩니다\"라고 솔직하게 말씀드리겠습니다.",
                gold: true,
              },
              {
                num: "02",
                icon: MessageCircle,
                title: "충분한 상담",
                desc: "환자분의 고민을 충분히 듣고 환자분이 이해하실때까지 충분히 설명하겠습니다.",
              },
              {
                num: "03",
                icon: Smile,
                title: "통증과 불안 최소화",
                desc: "최신 마취 기법과 무통마취기를 사용하여 치료 과정의 통증과 불안을 최소화하겠습니다.",
                gold: true,
              },
              {
                num: "04",
                icon: Timer,
                title: "대기시간 최소화",
                desc: "예약 시스템을 철저히 운영하여 환자분의 소중한 시간을 존중하겠습니다.",
              },
              {
                num: "05",
                icon: Sparkles,
                title: "철저한 감염관리",
                desc: "철저한 멸균 소독과 수질관리로 서울대학교병원 수준의 감염 관리를 실천합니다.",
                gold: true,
              },
              {
                num: "06",
                icon: HeartHandshake,
                title: "끝까지 책임",
                desc: "치료 후에도 정기 검진과 관리로 끝까지 책임집니다. 평생 주치의가 되겠습니다.",
              },
            ].map((item) => (
              <StaggerItem key={item.num}>
                <div className="relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-7 transition-shadow hover:shadow-md">
                  <span className="absolute top-5 right-5 font-headline text-3xl font-bold text-gray-100">
                    {item.num}
                  </span>
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${
                      "gold" in item && item.gold
                        ? "bg-[#FDF3E0] text-[var(--color-gold)]"
                        : "bg-blue-100 text-[var(--color-primary)]"
                    }`}
                  >
                    <item.icon size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
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

      {/* ───────────── 의료진 상세 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Doctor
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료진 소개
            </h2>
          </div>

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

      {/* ───────────── 시설 안내 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Facility
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              시설 안내
            </h2>
          </div>

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
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <div className="grid gap-10 md:grid-cols-2">
            {/* 진료시간 */}
            <div>
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
            </div>

            {/* 오시는 길 */}
            <div>
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <MapPin size={24} className="text-[var(--color-primary)]" />
                오시는 길
              </h2>

              {/* 카카오맵 */}
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
            </div>
          </div>
        </div>
      </section>

      {/* 모바일 하단 바 공간 확보 */}
      <div className="h-16 md:hidden" />
    </>
  );
}
