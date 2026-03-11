import { notFound, permanentRedirect } from "next/navigation";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { getBlogPostUrl } from "@/lib/blog";

export const revalidate = 3600;

export default async function LegacyBlogRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publishedPosts = await getAllPublishedPostMetas();
  const post = publishedPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  permanentRedirect(getBlogPostUrl(post.slug, post.category));
}
