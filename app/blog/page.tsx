import type { Metadata } from "next";
import { CLINIC, BASE_URL } from "@/lib/constants";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { getBlogCollectionJsonLd, getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import BlogContent from "@/components/blog/BlogContent";

export const revalidate = 3600;

const blogDescription = `${CLINIC.name} 건강칼럼에서는 올바른 양치법과 잇몸 관리, 임플란트·교정 후 관리, 충치·치주질환 예방, 소아 구강관리, 치과 상식 팩트체크까지 일상에서 바로 실천할 수 있는 구강건강 정보를 사례 중심으로 쉽게 알려드립니다. 치과 방문 전 궁금증을 줄일 수 있도록 핵심만 정확히 전달합니다.`;

export const metadata: Metadata = {
  title: "건강칼럼",
  description: blogDescription,
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: `건강칼럼 | ${CLINIC.name}`,
    description: blogDescription,
    url: `${BASE_URL}/blog`,
    siteName: CLINIC.name,
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630, alt: `${CLINIC.name} 건강칼럼` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `건강칼럼 | ${CLINIC.name}`,
    description: blogDescription,
    images: ["/images/og-image.jpg"],
  },
};

export default async function BlogPage() {
  const publishedPosts = await getAllPublishedPostMetas();
  const collectionJsonLd = getBlogCollectionJsonLd(publishedPosts);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold-text)] uppercase">
              Health Column
            </p>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              건강칼럼
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              올바른 구강관리법과 치과 상식을 쉽고 정확하게 알려드립니다.
            </p>
          </FadeIn>
        </div>
      </section>

      <BlogContent initialPosts={publishedPosts} />

      <div className="h-16 md:hidden" />
    </>
  );
}
