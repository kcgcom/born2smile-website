import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, HandHeart, Leaf } from "lucide-react";
import { CLINIC, TREATMENTS } from "@/lib/constants";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/Motion";

export const metadata: Metadata = {
  title: "진료 안내",
  description: `${CLINIC.name} 진료 안내 - 김포한강신도시 장기동 치과 임플란트, 치아교정, 틀니 및 심미보철, 소아치료, 보존치료, 스케일링`,
};

export default function TreatmentsPage() {
  return (
    <>
      {/* ───────────── 진료 철학 ───────────── */}
      <section className="section-padding pt-32 bg-white">
        <div className="container-narrow">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="sr-only">진료 안내</h1>
              <p className="mb-4 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
                Philosophy
              </p>
              <h2 className="font-headline mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
                진료 철학
              </h2>
              <p className="text-lg leading-relaxed text-gray-600">
                치아는 한번 잃으면 다시 돌아오지 않습니다.
                <br />
                그래서 저희는 모든 치료의 시작을
                <br className="sm:hidden" />
                &lsquo;지키는 것&rsquo;에서 출발합니다.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Leaf,
                title: "자연치아를 먼저 생각합니다",
                desc: "발치보다 보존을, 인공물보다 자연을 우선합니다. 꼭 필요한 치료만 정직하게 권해 드리는 것이 저희의 약속입니다.",
              },
              {
                icon: HandHeart,
                title: "마음까지 편안한 진료",
                desc: "치과가 두려운 분들의 마음을 누구보다 잘 압니다. 충분히 설명하고, 천천히 기다리며, 한 분 한 분 소중하게 진료합니다.",
                gold: true,
              },
              {
                icon: Heart,
                title: "오래오래 함께하는 주치의",
                desc: "한 번의 치료로 끝나는 관계가 아닌, 우리 가족의 평생 구강건강을 함께 지켜가는 따뜻한 동반자가 되겠습니다.",
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center transition-shadow hover:shadow-md">
                  <div
                    className={`mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full ${
                      "gold" in item && item.gold
                        ? "bg-[#FDF3E0] text-[var(--color-gold)]"
                        : "bg-blue-50 text-[var(--color-primary)]"
                    }`}
                  >
                    <item.icon size={26} />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-gray-900">
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

      {/* ───────────── 진료 과목 ───────────── */}
      <section className="section-padding bg-gray-50">
        <div className="container-narrow">
          <FadeIn className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
              Treatments
            </p>
            <h2 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl">
              진료 과목
            </h2>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TREATMENTS.map((treatment) => (
              <StaggerItem key={treatment.id}>
                <Link
                  href={treatment.href}
                  className="group block rounded-2xl border border-gray-100 bg-white p-8 transition-all hover:border-[var(--color-primary)] hover:shadow-lg"
                >
                  <h2 className="mb-2 text-2xl font-bold text-gray-900 group-hover:text-[var(--color-primary)]">
                    {treatment.name}
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-gray-600">
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
