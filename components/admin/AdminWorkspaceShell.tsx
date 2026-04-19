"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  FileText,
  Gauge,
  LayoutDashboard,
  Activity,
  MousePointerClick,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { signOutAdmin } from "@/lib/admin-auth";

interface AdminWorkspaceShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface WorkspaceConfig {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  tabs?: NavItem[];
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "operations",
    href: "/admin/operations/overview",
    label: "운영",
    icon: LayoutDashboard,
    tabs: [
      { href: "/admin/operations/overview", label: "개요", icon: LayoutDashboard },
      { href: "/admin/operations/conversion", label: "전환", icon: MousePointerClick },
      { href: "/admin/operations/ai-ops", label: "AI 운영실", icon: Bot },
    ],
  },
  {
    id: "analysis",
    href: "/admin/analysis/traffic",
    label: "분석",
    icon: TrendingUp,
    tabs: [
      { href: "/admin/analysis/traffic", label: "트래픽", icon: BarChart3 },
      { href: "/admin/analysis/search", label: "검색 성과", icon: FileText },
    ],
  },
  {
    id: "content",
    href: "/admin/content/posts",
    label: "콘텐츠",
    icon: FileText,
    tabs: [
      { href: "/admin/content/posts", label: "포스트 운영", icon: FileText },
      { href: "/admin/content/strategy", label: "콘텐츠 전략", icon: Target },
      { href: "/admin/content/trends", label: "트렌드", icon: TrendingUp },
    ],
  },
  {
    id: "system",
    href: "/admin/system/settings",
    label: "시스템",
    icon: Settings,
    tabs: [
      { href: "/admin/system/settings", label: "사이트 설정", icon: Settings },
      { href: "/admin/system/monitoring", label: "모니터링", icon: Activity },
      { href: "/admin/system/devtools", label: "개발도구", icon: Gauge },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isWorkspaceActive(pathname: string, workspace: WorkspaceConfig) {
  if (isActivePath(pathname, workspace.href)) {
    return true;
  }

  return workspace.tabs?.some((tab) => isActivePath(pathname, tab.href)) ?? false;
}

function getWorkspace(pathname: string) {
  return WORKSPACES.find((workspace) => isWorkspaceActive(pathname, workspace)) ?? WORKSPACES[0];
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1 lg:flex lg:flex-row lg:overflow-x-auto lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
      aria-label="관리자 워크스페이스"
    >
      {WORKSPACES.map((workspace) => {
        const Icon = workspace.icon;
        const active = isWorkspaceActive(pathname, workspace);
        return (
          <Link
            key={workspace.id}
            href={workspace.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all lg:min-w-[132px] lg:flex-1 lg:whitespace-nowrap lg:px-4 ${
              active
                ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{workspace.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SectionTabs({
  pathname,
  workspace,
}: {
  pathname: string;
  workspace: WorkspaceConfig;
}) {
  if (!workspace.tabs?.length) {
    return null;
  }

  const gridClass =
    workspace.tabs.length <= 2
      ? "grid-cols-2"
      : workspace.tabs.length === 3
        ? "grid-cols-3"
        : "grid-cols-2 md:grid-cols-3";

  return (
    <nav
      className="mt-4 rounded-xl bg-slate-100/80 p-1"
      aria-label={`${workspace.label} 세부 화면`}
    >
      <div className={`grid ${gridClass} gap-1 xl:flex xl:flex-row xl:items-center xl:gap-1 xl:overflow-x-auto xl:[-ms-overflow-style:none] xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden`}>
        {workspace.tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActivePath(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-all xl:min-w-[112px] xl:flex-1 xl:gap-1.5 xl:whitespace-nowrap xl:px-3 xl:py-1.5 xl:text-xs ${
                active
                  ? "bg-white font-semibold text-amber-600 shadow-sm"
                  : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminWorkspaceShell({ children }: AdminWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const workspace = useMemo(() => getWorkspace(pathname), [pathname]);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f8fafc_16%,#f8fafc_100%)]">
      <DashboardHeader onLogout={handleLogout} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AdminSurface tone="white" className="rounded-3xl px-5 py-4">
          <div className="flex flex-col gap-3">
            <WorkspaceNav pathname={pathname} />
            <SectionTabs pathname={pathname} workspace={workspace} />
          </div>
        </AdminSurface>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
