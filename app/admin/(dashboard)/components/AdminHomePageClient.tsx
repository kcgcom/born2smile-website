"use client";

import { useRouter } from "next/navigation";
import { DashboardTab } from "./DashboardTab";

export function AdminHomePageClient() {
  const router = useRouter();

  return <DashboardTab navigateTo={(href) => router.push(href)} />;
}
