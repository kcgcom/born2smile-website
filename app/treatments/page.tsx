import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CLINIC, TREATMENTS, BASE_URL } from "@/lib/constants";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "진료 안내",
  description: `${CLINIC.name} 진료 안내 페이지입니다. 김포 한강신도시 장기동에서 임플란트, 치아교정, 틀니·심미보철, 소아치료, 보존치료, 스케일링·예방치료까지 각 진료의 대상, 치료 과정, 기대 효과와 상담 포인트를 한눈에 비교해보실 수 있습니다. 개인 상태에 맞는 진료 선택 기준도 함께 제공합니다.`,
  alternates: { canonical: `${BASE_URL}/treatments` },
};

export default function TreatmentsPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "진료 안내", href: "/treatments" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {/* ───────────── 히어로 ───────────── */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold-text)] uppercase">
              Treatments
            </p>
            <h1 className="font-headline text-4xl font-bold text-[var(--foreground)] md:text-5xl">
              진료 안내
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">
              자연치아를 지키는 치료, {CLINIC.name}에서 시작하세요.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ───────────── 진료 철학 ───────────── */}
      <section className="section-padding bg-[var(--surface)]">
        <div className="container-narrow">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold-text)] uppercase">
                Philosophy
              </p>
              <h2 className="font-headline mb-6 text-3xl font-bold text-[var(--foreground)] md:text-4xl">
                진료 철학
              </h2>
              <p className="text-lg leading-relaxed text-[var(--muted)]">
                치아는 한번 잃으면 다시 돌아오지 않습니다.
                <br />
                그래서 저희는 모든 치료의 시작을
                <br className="sm:hidden" />
                {" "}&lsquo;지키는 것&rsquo;에서 출발합니다.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mx-auto mt-14 grid max-w-5xl overflow-hidden border-y border-[var(--border)] lg:grid-cols-[1.1fr_1fr]">
            <StaggerItem className="bg-[var(--background)]">
              <div className="px-2 py-10 sm:px-8 md:py-12 lg:px-10 lg:py-14 lg:pr-16">
                <p className="font-headline text-sm font-bold tracking-[0.2em] text-[var(--color-gold-text)]">
                  01
                </p>
                <h3 className="font-headline mt-4 text-2xl font-bold text-[var(--foreground)] md:text-3xl">
                  자연치아를 먼저 생각합니다
                </h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-[var(--foreground)]">
                  발치보다 보존을, 인공물보다 자연을 우선합니다. 꼭 필요한
                  치료만 권합니다.
                </p>
              </div>
            </StaggerItem>

            <div className="border-t border-[var(--border)] lg:border-t-0 lg:border-l">
              {[
                {
                  number: "02",
                  title: "마음까지 편안한 진료",
                  desc: "무엇을 왜 하는지 충분히 설명하고, 서두르지 않고 기다릴 시간을 드립니다.",
                },
                {
                  number: "03",
                  title: "오래오래 함께하는 주치의",
                  desc: "한 번의 치료보다 오래 지켜보는 관계를 생각합니다.",
                },
              ].map((item, index) => (
                <StaggerItem
                  key={item.number}
                  className={index === 0 ? "border-b border-[var(--border)]" : ""}
                >
                  <div className="grid gap-3 px-2 py-8 sm:grid-cols-[3rem_1fr] sm:px-8 lg:px-12 lg:py-9">
                    <p className="font-headline text-sm font-bold tracking-[0.2em] text-[var(--color-gold-text)]">
                      {item.number}
                    </p>
                    <div>
                      <h3 className="font-headline text-xl font-bold text-[var(--foreground)] md:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-base leading-7 text-[var(--foreground)]">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* ───────────── 진료 과목 ───────────── */}
      <section className="section-padding bg-[var(--background)]">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold-text)] uppercase">
              Treatments
            </p>
            <h2 className="font-headline text-3xl font-bold text-[var(--foreground)] md:text-4xl">
              진료 과목
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TREATMENTS.map((treatment) => (
              <StaggerItem key={treatment.id}>
                <Link
                  href={treatment.href}
                  className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-all hover:border-[var(--color-primary)] hover:shadow-lg"
                >
                  <h3 className="mb-2 text-2xl font-bold text-[var(--foreground)] group-hover:text-[var(--color-primary)]">
                    {treatment.name}
                  </h3>
                  <p className="mb-6 text-base leading-relaxed text-[var(--foreground)]">
                    {treatment.shortDesc}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                    자세히 보기
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
