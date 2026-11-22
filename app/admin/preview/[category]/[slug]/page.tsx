import { BlogPreviewPage } from "@/components/admin/BlogPreviewPage";

export const dynamic = "force-dynamic";

export default function PreviewPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  return <BlogPreviewPage params={params} />;
}
