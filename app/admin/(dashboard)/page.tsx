import { redirect } from "next/navigation";
import { AdminHomePageClient } from "./components/AdminHomePageClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildLegacyAdminPath({
  tab,
  sub,
  edit,
  newCategory,
}: {
  tab?: string;
  sub?: string;
  edit?: string;
  newCategory?: string;
}) {
  if (edit) {
    return `/admin/content/posts/${edit}`;
  }

  if (newCategory) {
    return `/admin/content/posts/new?category=${encodeURIComponent(newCategory)}`;
  }

  switch (tab) {
    case undefined:
    case "dashboard":
      return null;
    case "content":
      if (sub === "schedule") return "/admin/content/schedule";
      if (sub === "stats") return "/admin/content/stats";
      if (sub === "strategy") return "/admin/content/strategy";
      return "/admin/content/posts";
    case "seo":
      if (sub === "traffic") return "/admin/growth/traffic";
      if (sub === "strategy") return "/admin/content/strategy";
      if (sub === "trend") return "/admin/growth/trends";
      return "/admin/growth/search";
    case "conversion":
      return "/admin/growth/conversion";
    case "aiops":
      switch (sub) {
        case "suggestions":
          return "/admin/growth/ai-ops/suggestions";
        case "queue":
          return "/admin/growth/ai-ops/queue";
        case "activity":
          return "/admin/growth/ai-ops/activity";
        case "briefing":
        default:
          return "/admin/growth/ai-ops/briefing";
      }
    case "settings":
      return "/admin/system/settings";
    case "devtools":
      switch (sub) {
        case "perf":
          return "/admin/system/devtools/perf";
        case "ref":
          return "/admin/system/devtools/ref";
        case "monitoring":
          return "/admin/system/devtools/monitoring";
        case "ai":
          return "/admin/system/devtools/ai";
        case "project":
        default:
          return "/admin/system/devtools/project";
      }
    case "dev":
      switch (sub) {
        case "perf":
          return "/admin/system/devtools/perf";
        case "ref":
          return "/admin/system/devtools/ref";
        case "monitoring":
          return "/admin/system/devtools/monitoring";
        case "ai":
          return "/admin/system/devtools/ai";
        case "project":
        default:
          return "/admin/system/devtools/project";
      }
    case "insight":
    case "search":
      return "/admin/growth/search";
    case "traffic":
      return "/admin/growth/traffic";
    case "trend":
      return "/admin/growth/trends";
    case "blog":
      return "/admin/content/posts";
    case "ai":
    case "ops":
      return "/admin/growth/ai-ops/briefing";
    default:
      return null;
  }
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const path = buildLegacyAdminPath({
    tab: getString(resolved.tab),
    sub: getString(resolved.sub),
    edit: getString(resolved.edit),
    newCategory: getString(resolved.newCategory),
  });

  if (path) {
    redirect(path);
  }

  return <AdminHomePageClient />;
}
