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
  Wind,
  Syringe,
  ScanLine,
  Check,
  ShieldCheck,
} from "lucide-react";
import { CLINIC, DOCTORS, HOURS, STAFF, BASE_URL } from "@/lib/constants";
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
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              About Us
            </p>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              병원 소개
            </h1>
            <p className="mt-4 text-base text-gray-600 md:text-lg">
              서울대 출신 통합치의학전문의가 정성을 다해 진료합니다
            </p>
          </FadeIn>
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

      {/* ───────────── 의료팀 소개 ───────────── */}
      <section id="our-team" className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Our Team
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              의료팀 소개
            </h2>
          </FadeIn>

          {/* 핵심 메시지 배너 */}
          <FadeIn delay={0.1}>
            <div className="mb-10 rounded-2xl border border-[var(--color-gold)]/20 bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-primary)]/5 px-6 py-8 text-center md:px-10 md:py-10">
              <ShieldCheck
                size={40}
                className="mx-auto mb-4 text-[var(--color-gold)]"
              />
              <h3 className="font-headline text-xl font-bold text-gray-900 md:text-2xl">
                {STAFF.credential}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-gray-700">
                {STAFF.summary}
              </p>
            </div>
          </FadeIn>

          {/* 역량 카드 */}
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAFF.highlights.map((item) => (
              <StaggerItem key={item.title}>
                <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md">
                  <h4 className="mb-2 text-lg font-bold text-gray-900">
                    {item.title}
                  </h4>
                  <p className="text-base leading-relaxed text-gray-700">
                    {item.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
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
              { name: "진료실", desc: "파티션으로 구분된 개별 진료공간", src: "/images/facility/treatment-room.jpg" },
              { name: "대기실", desc: "갤러리 같은 편안한 대기공간", src: "/images/facility/waiting-room.jpg" },
              { name: "상담실", desc: "1:1맞춤상담이 가능한 별도의 상담실", src: "/images/facility/consultation-room.jpg" },
              { name: "VIP실", desc: "프라이버시가 보장된 독립 진료실", src: "/images/facility/vip-room.jpg" },
              { name: "X-ray실", desc: "방사선 노출이 적은 최신 디지털CT", src: "/images/facility/xray-room.jpg" },
              { name: "외관", desc: "김포시 장기동 엠프라자 2층", src: "/images/facility/exterior.jpg" },
            ].map((item) => (
              <StaggerItem key={item.name}>
                <div className="group relative overflow-hidden rounded-2xl">
                  <Image
                    src={item.src}
                    alt={`${CLINIC.name} ${item.name} - ${item.desc}`}
                    width={600}
                    height={450}
                    sizes="(min-width: 1152px) 368px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3 backdrop-blur-[2px]">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-white/90">{item.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── 주요 장비 소개 ───────────── */}
      <section className="section-padding bg-white">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Equipment
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              주요 장비 소개
            </h2>
            <p className="mt-4 text-gray-600">
              정확한 진단과 편안한 치료를 위해 최신 장비를 갖추고 있습니다
            </p>
          </FadeIn>

          <StaggerContainer className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Wind,
                name: "에어플로우",
                nameEn: "Airflow",
                tagline: "아프지 않은 스케일링의 비밀",
                desc: "미세한 파우더와 물, 공기를 분사하여 치아 표면의 바이오필름과 착색을 부드럽게 제거합니다. 기존 초음파 스케일링과 달리 금속 기구가 치아에 직접 닿지 않아 시린 느낌과 통증이 거의 없습니다.",
                features: [
                  "치아와 잇몸에 자극이 적어 통증 최소화",
                  "초음파 기구가 닿지 못하는 미세한 틈까지 세정",
                  "치아 표면 손상 없이 착색과 바이오필름 제거",
                  "임플란트·교정장치 주변도 안전하게 관리",
                ],
              },
              {
                icon: Syringe,
                name: "무통마취기",
                nameEn: "Computer-Controlled Anesthesia",
                tagline: "마취 주사도 아프지 않게",
                desc: "컴퓨터가 마취액의 주입 속도와 압력을 정밀하게 조절합니다. 일반 주사기 마취에 비해 통증이 크게 줄어, 치과가 무서우신 분이나 어린이도 편안하게 치료받으실 수 있습니다.",
                features: [
                  "컴퓨터 제어로 최적의 주입 속도와 압력 유지",
                  "일반 주사기 대비 통증 대폭 감소",
                  "소아 환자·치과 공포증 환자도 편안하게",
                  "필요한 부위만 정밀하게 마취 가능",
                ],
              },
              {
                icon: ScanLine,
                name: "3D 디지털 CT",
                nameEn: "Cone Beam CT",
                tagline: "보이지 않는 곳까지 정밀 진단",
                desc: "3차원 입체 영상으로 치아, 잇몸뼈, 신경관의 위치를 정밀하게 파악합니다. 일반 X-ray로는 확인할 수 없는 구조를 입체적으로 분석하여 정확한 치료 계획을 수립합니다.",
                features: [
                  "일반 의료용 CT 대비 방사선량 최소화",
                  "임플란트 식립 위치·각도 사전 시뮬레이션",
                  "매복 사랑니, 숨은 병변 등 정밀 진단",
                  "촬영 시간 약 15초, 빠르고 간편",
                ],
              },
            ].map((item) => (
              <StaggerItem key={item.name}>
                <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-7">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                    <item.icon size={24} className="text-[var(--color-primary)]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                  <p className="mb-3 text-sm text-[var(--color-muted)]">{item.nameEn}</p>
                  <p className="mb-1 text-sm font-medium text-[var(--color-gold)]">
                    {item.tagline}
                  </p>
                  <p className="mb-6 text-base leading-relaxed text-gray-700">
                    {item.desc}
                  </p>
                  <ul className="mt-auto space-y-2.5">
                    {item.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-gray-600">
                        <Check
                          size={16}
                          className="mt-0.5 shrink-0 text-[var(--color-primary)]"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
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
              <h2 className="font-headline mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Clock size={24} className="text-[var(--color-gold)]" />
                진료시간
              </h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-base">
                  <caption className="sr-only">요일별 진료시간표</caption>
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">요일</th>
                      <th scope="col">진료시간</th>
                    </tr>
                  </thead>
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
                          className={`px-5 py-3 text-right ${item.open ? "text-gray-900" : "text-gray-500"}`}
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
