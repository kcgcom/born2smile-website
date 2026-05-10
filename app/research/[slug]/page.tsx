import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, BookOpen, FlaskConical } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { getResearchPage, getAllResearchSlugs } from "@/lib/research/papers";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/Motion";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllResearchSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getResearchPage(slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${BASE_URL}/research/${slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${BASE_URL}/research/${slug}`,
    },
  };
}

export default async function ResearchPageDetail({ params }: Props) {
  const { slug } = await params;
  const page = getResearchPage(slug);
  if (!page) notFound();

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "연구 자료", href: "/research" },
    { name: page.title, href: `/research/${slug}` },
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
              {page.category} · 임상 연구
            </span>
            <h1 className="font-headline text-3xl font-bold text-gray-900 md:text-4xl leading-snug">
              {page.title}
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-2xl mx-auto">
              {page.subtitle}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 안내 배너 */}
      <section className="bg-amber-50 border-y border-amber-100 py-4">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm text-amber-800 leading-relaxed">
            이 페이지는 치과 임상가 및 근거 중심 치료에 관심 있는 분들을 위해
            관련 연구를 요약·소개합니다. 개별 임상 결정은 반드시 담당 치과의사와
            상담하시기 바랍니다.
          </p>
        </div>
      </section>

      {/* 논문 목록 */}
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-3xl px-4 space-y-16">
          <StaggerContainer>
            {page.papers.map((paper, index) => (
              <StaggerItem key={paper.id}>
                <article className="border border-gray-200 rounded-2xl overflow-hidden">
                  {/* 논문 헤더 */}
                  <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {paper.journal}
                          </span>
                          <span className="text-xs text-gray-400">{paper.year}</span>
                          {paper.sampleSize && (
                            <span className="text-xs text-gray-400">
                              · {paper.sampleSize}
                            </span>
                          )}
                          {paper.followUpPeriod && (
                            <span className="text-xs text-gray-400">
                              · 추적 {paper.followUpPeriod}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono leading-relaxed">
                          {paper.title}
                        </p>
                        <h2 className="mt-2 text-lg font-bold text-gray-900 leading-snug">
                          {paper.titleKo}
                        </h2>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-gray-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* 핵심 수치 */}
                  <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                      핵심 수치
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {paper.keyFindings.map((finding, i) => (
                        <div
                          key={i}
                          className="bg-blue-50 rounded-xl px-5 py-4"
                        >
                          <p className="text-3xl font-bold text-blue-700 leading-none">
                            {finding.stat}
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-gray-800">
                            {finding.label}
                          </p>
                          {finding.context && (
                            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                              {finding.context}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 요약 */}
                  <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      연구 요약
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {paper.summary}
                    </p>
                  </div>

                  {/* 임상적 시사점 + 원문 링크 */}
                  <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {paper.clinicalNote && (
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                          임상적 시사점
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {paper.clinicalNote}
                        </p>
                      </div>
                    )}
                    <a
                      href={paper.pubmedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      원문 보기 (PubMed)
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 관련 블로그 */}
      {page.relatedBlogSlugs.length > 0 && (
        <section className="section-padding bg-gray-50">
          <div className="mx-auto max-w-3xl px-4">
            <FadeIn>
              <h2 className="font-headline text-xl font-bold text-gray-900 mb-6">
                환자분께 드리는 관련 글
              </h2>
              <div className="space-y-3">
                {page.relatedBlogSlugs.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.category}/${post.slug}`}
                    className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                      {post.title}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </>
  );
}
