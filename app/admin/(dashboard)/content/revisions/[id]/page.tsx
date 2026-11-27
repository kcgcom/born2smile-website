import { RevisionReviewScreen } from "../../../components/blog/RevisionReviewScreen";

export default async function ContentRevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ id }, { returnTo }] = await Promise.all([params, searchParams]);
  return <RevisionReviewScreen id={id} returnTo={typeof returnTo === "string" ? returnTo : undefined} />;
}
