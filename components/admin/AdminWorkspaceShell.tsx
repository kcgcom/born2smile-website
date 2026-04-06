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
  MousePointerClick,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
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
  description: string;
  tabs?: NavItem[];
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "home",
    href: "/admin",
    label: "홈",
    icon: LayoutDashboard,
    description: "오늘의 핵심 지표와 운영 우선순위를 빠르게 확인합니다.",
  },
  {
    id: "content",
    href: "/admin/content/posts",
    label: "콘텐츠",
    icon: FileText,
    description: "포스트 관리, 발행 일정, 성과 확인을 한 흐름으로 다룹니다.",
    tabs: [
      { href: "/admin/content/posts", label: "포스트 관리", icon: FileText },
      { href: "/admin/content/schedule", label: "발행 일정", icon: Sparkles },
      { href: "/admin/content/stats", label: "성과", icon: BarChart3 },
    ],
  },
  {
    id: "growth",
    href: "/admin/growth/overview",
    label: "성장",
    icon: TrendingUp,
    description: "유입, 검색 성과, 전환, AI 개선 제안을 함께 살펴봅니다.",
    tabs: [
      { href: "/admin/growth/overview", label: "개요", icon: LayoutDashboard },
      { href: "/admin/growth/traffic", label: "트래픽", icon: BarChart3 },
      { href: "/admin/growth/search", label: "검색 성과", icon: FileText },
      { href: "/admin/growth/strategy", label: "콘텐츠 전략", icon: Target },
      { href: "/admin/growth/trends", label: "트렌드", icon: TrendingUp },
      { href: "/admin/growth/conversion", label: "전환", icon: MousePointerClick },
      { href: "/admin/growth/ai-ops", label: "AI 운영실", icon: Bot },
    ],
  },
  {
    id: "system",
    href: "/admin/system/settings",
    label: "시스템",
    icon: Settings,
    description: "사이트 설정과 개발도구처럼 저빈도 관리 작업을 분리합니다.",
    tabs: [
      { href: "/admin/system/settings", label: "사이트 설정", icon: Settings },
      { href: "/admin/system/devtools", label: "개발도구", icon: Gauge },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getWorkspace(pathname: string) {
  if (pathname === "/admin") {
    return WORKSPACES[0];
  }

  return WORKSPACES.slice(1).find((workspace) => isActivePath(pathname, workspace.href)) ?? WORKSPACES[0];
}

function getPageLabel(pathname: string, workspace: WorkspaceConfig) {
  if (pathname === "/admin/content/posts/new") {
    return "새 포스트 작성";
  }

  if (pathname.startsWith("/admin/content/posts/")) {
    return "포스트 편집";
  }

  if (!workspace.tabs) {
    return workspace.label;
  }

  const activeTab = workspace.tabs.find((tab) => isActivePath(pathname, tab.href));
  return activeTab?.label ?? workspace.label;
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1 lg:flex lg:flex-row lg:overflow-x-auto lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
      aria-label="관리자 워크스페이스"
    >
      {WORKSPACES.map((workspace) => {
        const Icon = workspace.icon;
        const active = workspace.id === "home"
          ? pathname === workspace.href
          : isActivePath(pathname, workspace.href);
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

  return (
    <nav
      className="mt-4 rounded-xl bg-slate-100/80 p-1"
      aria-label={`${workspace.label} 세부 화면`}
    >
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:flex xl:flex-row xl:items-center xl:gap-1 xl:overflow-x-auto xl:[-ms-overflow-style:none] xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
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
  const pageLabel = useMemo(() => getPageLabel(pathname, workspace), [pathname, workspace]);

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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminPill tone={workspace.id === "system" ? "warning" : "white"}>{workspace.label}</AdminPill>
                  {workspace.id === "system" && <AdminPill tone="warning">저빈도 관리 영역</AdminPill>}
                </div>
                <h1 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{pageLabel}</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">{workspace.description}</p>
              </div>
            </div>

            <WorkspaceNav pathname={pathname} />
            <SectionTabs pathname={pathname} workspace={workspace} />
          </div>
        </AdminSurface>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
