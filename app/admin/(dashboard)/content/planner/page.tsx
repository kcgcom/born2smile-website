import { ContentPlannerSubTab } from "../../components/planner/ContentPlannerSubTab";

export default async function AdminContentPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string }>;
}) {
  const { opportunity } = await searchParams;
  return <ContentPlannerSubTab requestedOpportunityKey={opportunity ?? null} />;
}
