import { ConversionReportTab } from "../../components/ConversionTab";

export default async function AdminOperationsConversionPage({ searchParams }: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location } = await searchParams;
  return <ConversionReportTab key={location === "mobile" ? "mobile" : "all"} initialMobileLocations={location === "mobile"} />;
}
