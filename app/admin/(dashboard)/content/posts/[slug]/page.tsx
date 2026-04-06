import { BlogEditorScreen } from "../../../components/blog/BlogEditorScreen";

export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BlogEditorScreen mode="edit" slug={slug} />;
}
