import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, BookOpen, ArrowRight } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { getAllResearchSlugsFresh, getResearchPageFresh } from "@/lib/research/papers";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "임상 연구 자료실",
  description:
    "서울본치과가 진료 근거로 삼는 국제 학술 논문을 환자 눈높이에 맞게 요약합니다. 임플란트 생존율, 신경치료 통증, 당뇨·흡연과 구강건강 등 주요 주제별 메타분석 결과를 확인하세요.",
  alternates: { canonical: `${BASE_URL}/research` },
  openGraph: {
    title: "임상 연구 자료실 | 서울본치과",
    description:
      "국제 학술 논문을 환자 눈높이에 맞게 요약한 임상 연구 페이지 모음입니다.",
    url: `${BASE_URL}/research`,
  },
};

const CATEGORY_COLOR: Record<string, string> = {
  임플란트: "bg-blue-50 text-blue-700",
  보존치료: "bg-teal-50 text-teal-700",
  소아치료: "bg-green-50 text-green-700",
  예방관리: "bg-emerald-50 text-emerald-700",
  건강상식: "bg-purple-50 text-purple-700",
};

export default async function ResearchHubPage() {
  const slugs = await getAllResearchSlugsFresh();
  const pages = (
    await Promise.all(slugs.map((slug) => getResearchPageFresh(slug)))
  ).filter(Boolean) as Awaited<ReturnType<typeof getResearchPageFresh>>[];

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "연구 자료", href: "/research" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      {/* 히어로 */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 mb-4">
              <FlaskConical className="w-3.5 h-3.5" />
              임상 연구 자료실
            </span>
            <h1 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl leading-snug">
              진료 결정의 근거가 되는 연구들
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-2xl mx-auto">
              국제 학술지에 발표된 메타분석과 체계적 문헌고찰을 환자 눈높이에
              맞게 요약했습니다. 숫자 뒤에 있는 맥락을 함께 확인하세요.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 안내 배너 */}
      <section className="bg-amber-50 border-y border-amber-100 py-4">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm text-amber-800 leading-relaxed">
            이 페이지는 치과 임상가 및 근거 중심 치료에 관심 있는 분들을 위해
            관련 연구를 요약·소개합니다. 개별 임상 결정은 반드시 담당
            치과의사와 상담하시기 바랍니다.
          </p>
        </div>
      </section>

      {/* 연구 목록 */}
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-3xl px-4">
          <StaggerContainer className="space-y-4">
            {pages.map((page) => (
              <StaggerItem key={page!.slug}>
                <Link
                  href={`/research/${page!.slug}`}
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 rounded-2xl px-6 py-5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLOR[page!.category] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {page!.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        논문 {page!.papers.length}편
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {page!.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed line-clamp-2">
                      {page!.description}
                    </p>
                    {/* 핵심 수치 미리보기 */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {page!.papers.slice(0, 2).flatMap((paper) =>
                        paper.keyFindings.slice(0, 1).map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                          >
                            {f.stat} {f.label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-sm text-blue-600 font-medium group-hover:gap-2 transition-all">
                    <BookOpen className="w-4 h-4" />
                    연구 보기
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
