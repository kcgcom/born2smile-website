import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FlaskConical } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { getResearchPageFresh, getResearchPageAdmin, getAllResearchSlugsFresh } from "@/lib/research/papers";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import { InlineResearchEditButton } from "@/components/admin/InlineResearchEditButton";
import { ResearchEditProvider } from "@/components/admin/ResearchEditContext";
import { ResearchPapersView } from "@/components/research/ResearchPapersView";
import { getIsAdminServer } from "@/lib/server-admin-check";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllResearchSlugsFresh();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getResearchPageFresh(slug);
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
  const isAdmin = await getIsAdminServer();

  let page;
  let verified: boolean;

  if (isAdmin) {
    const result = await getResearchPageAdmin(slug);
    if (!result) notFound();
    page = result.page;
    verified = result.verified;
  } else {
    page = await getResearchPageFresh(slug);
    if (!page) notFound();
    verified = true;
  }

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "연구 자료", href: "/research" },
    { name: page.title, href: `/research/${slug}` },
  ]);

  return (
    <ResearchEditProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <InlineResearchEditButton page={page} verified={verified} />

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
        <div className="mx-auto max-w-3xl px-4">
          <ResearchPapersView page={page} />
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
    </ResearchEditProvider>
  );
}
