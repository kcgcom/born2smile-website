import { ContentPlannerSubTab } from "../../components/planner/ContentPlannerSubTab";

export default async function AdminContentPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string; type?: string }>;
}) {
  const { opportunity, type } = await searchParams;
  const opportunityType = opportunity?.split(":", 1)[0];
  const initialItemType = type === "page" || type === "blog" || type === "faq"
    ? type
    : opportunityType === "page" || opportunityType === "blog" || opportunityType === "faq"
      ? opportunityType
      : "page";
  return <ContentPlannerSubTab requestedOpportunityKey={opportunity ?? null} initialItemType={initialItemType} />;
}
