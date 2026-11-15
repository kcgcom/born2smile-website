import { redirect } from "next/navigation";

export default async function AdminContentPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string; type?: string }>;
}) {
  const { opportunity, type } = await searchParams;
  const query = new URLSearchParams();
  if (opportunity) query.set("opportunity", opportunity);
  if (type === "page" || type === "blog" || type === "faq") query.set("type", type);
  redirect(`/admin/content/tasks${query.size ? `?${query}` : ""}`);
}
