import { RevisionReviewScreen } from "../../../components/blog/RevisionReviewScreen";

export default async function ContentRevisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RevisionReviewScreen id={id} />;
}
