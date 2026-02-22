import { permanentRedirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getPostBySlugFromFirestore } from "@/lib/blog-firestore";
import { getBlogPostUrl } from "@/lib/blog";

/**
 * 기존 /blog/[slug] URL → /blog/[category]/[slug] 영구 리다이렉트
 * middleware에서 /blog/redirect/[slug]로 rewrite된 요청을 처리합니다.
 */
export default async function BlogPostRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlugFromFirestore(slug);
  if (!post) notFound();

  permanentRedirect(getBlogPostUrl(slug, post.category));
}
