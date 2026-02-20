import type { Metadata } from "next";
import { CLINIC, BASE_URL } from "@/lib/constants";
import { BLOG_POSTS_META } from "@/lib/blog";
import { getBlogCollectionJsonLd, getBreadcrumbJsonLd } from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import BlogContent from "@/components/blog/BlogContent";

export const metadata: Metadata = {
  title: "건강칼럼",
  description: `${CLINIC.name} 건강칼럼 - 올바른 양치법, 잇몸 관리, 임플란트 관리, 충치 예방 등 일상에서 실천할 수 있는 구강관리 정보를 전해드립니다.`,
  alternates: { canonical: `${BASE_URL}/blog` },
};

export default function BlogPage() {
  const today = new Date().toISOString().slice(0, 10);
  const publishedPosts = BLOG_POSTS_META
    .filter((p) => p.date <= today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const collectionJsonLd = getBlogCollectionJsonLd(publishedPosts);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
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

      <BlogContent />

      <div className="h-16 md:hidden" />
    </>
  );
}
