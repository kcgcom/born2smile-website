import { TrafficTab } from "../../components/TrafficTab";

export default async function AdminAnalysisTrafficPage({ searchParams }: {
  searchParams: Promise<{ view?: string; section?: string }>;
}) {
  const { view, section } = await searchParams;
  return <TrafficTab key={`${view ?? ""}:${section ?? ""}`} initialBlogView={view === "blog"} initialTreatmentSection={section === "treatments"} />;
}
