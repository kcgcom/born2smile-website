"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  Gauge,
  Image,
  KanbanSquare,
  LayoutDashboard,
  MousePointerClick,
  Search,
  ScanSearch,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { AdminBrowserPresence } from "@/components/admin/AdminBrowserPresence";
import { ADMIN_HOME } from "@/lib/admin-access";
import { preloadAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";

interface AdminWorkspaceShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  aliases?: string[];
}

interface WorkspaceConfig {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  tabs: NavItem[];
}

const PERFORMANCE_PATH = "/admin/system/monitoring";
const MOBILE_PSI_ENDPOINT = "/api/dev/pagespeed?strategy=mobile";
const INDEXING_PATH = "/admin/analysis/indexing";
const INDEXING_ENDPOINT = "/api/admin/indexing-status";
const CONTENT_WORK_TABS = [
  { href: ADMIN_HOME.content, label: "작업 목록", related: ["/admin/content/revisions"] },
  { href: "/admin/content/strategy/actions", label: "행동추천", related: ["/admin/content/strategy/reevaluation-review"] },
  { href: "/admin/content/strategy", label: "기회 분석" },
  { href: "/admin/content/trends", label: "검색 트렌드·키워드" },
];

function preloadTabData(href: string) {
  if (href === PERFORMANCE_PATH) preloadAdminApi(MOBILE_PSI_ENDPOINT);
  if (href === INDEXING_PATH) preloadAdminApi(INDEXING_ENDPOINT);
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "operations",
    href: ADMIN_HOME.operations,
    label: "운영",
    icon: LayoutDashboard,
    tabs: [
      { href: "/admin/operations/overview", label: "오늘 할 일", icon: LayoutDashboard },
      { href: "/admin/analysis/search", label: "검색 성과", icon: Search },
      { href: "/admin/analysis/traffic", label: "방문·읽기", icon: BarChart3 },
      { href: "/admin/operations/conversion", label: "문의·공유", icon: MousePointerClick },
      { href: "/admin/operations/insurance-forms", label: "보험 양식", icon: FileText },
      { href: "/admin/analysis/indexing", label: "색인 상태", icon: ScanSearch },
    ],
  },
  {
    id: "content",
    href: ADMIN_HOME.content,
    label: "콘텐츠",
    icon: FileText,
    tabs: [
      { href: ADMIN_HOME.content, label: "작업함", icon: KanbanSquare, aliases: ["/admin/content/planner", "/admin/content/strategy", "/admin/content/trends", "/admin/content/revisions"] },
      { href: "/admin/content/posts", label: "포스트", icon: FileText },
      { href: "/admin/content/schedule", label: "발행 일정", icon: Activity },
      { href: "/admin/content/images", label: "이미지", icon: Image },
    ],
  },
  {
    id: "system",
    href: ADMIN_HOME.system,
    label: "시스템",
    icon: Settings,
    tabs: [
      { href: "/admin/system/settings", label: "병원 설정", icon: Settings },
      { href: "/admin/operations/accounts", label: "계정 관리", icon: Settings },
      { href: "/admin/system/monitoring", label: "성능", icon: Gauge },
      { href: "/admin/system/devtools/project", label: "프로젝트", icon: ClipboardCheck },
      { href: "/admin/system/devtools/ref", label: "레퍼런스", icon: BookOpen },
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

  return workspace.tabs.some((tab) => isItemActive(pathname, tab));
}

function isItemActive(pathname: string, item: NavItem) {
  return isActivePath(pathname, item.href) || Boolean(item.aliases?.some(path => isActivePath(pathname, path)));
}

function getWorkspace(pathname: string) {
  return WORKSPACES.find((workspace) => isWorkspaceActive(pathname, workspace));
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className={`flex [&>a]:flex-1 lg:[&>a]:flex-none gap-1 rounded-2xl bg-slate-100/80 p-1 lg:flex lg:shrink-0`}
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
            className={`flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-2.5 text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:gap-2 sm:px-3 lg:px-3 ${
              active
                ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={16} className="shrink-0" aria-hidden="true" />
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
      className="rounded-xl bg-slate-100/80 p-1 lg:min-w-0 lg:flex-1"
      aria-label={`${workspace.label} 세부 화면`}
    >
      <div className={`grid gap-1 lg:flex lg:flex-wrap ${workspace.tabs.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : workspace.tabs.length === 6
          ? "grid-cols-3 sm:grid-cols-6"
          : "grid-cols-6 max-sm:[&>a]:col-span-2 max-sm:[&>a:nth-child(-n+2)]:col-span-3 sm:grid-cols-5"}`}>
        {workspace.tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isItemActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onPointerEnter={() => preloadTabData(tab.href)}
              onFocus={() => preloadTabData(tab.href)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-normal rounded-lg border-b-2 border-transparent px-0.5 py-2 text-center text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-3 lg:whitespace-nowrap ${
                active
                  ? "border-amber-800 bg-white font-semibold text-amber-900 shadow-sm"
                  : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={13} className="hidden shrink-0 sm:block" aria-hidden="true" />
              <span className="break-keep">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ContentWorkNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const [lastListQuery, setLastListQuery] = useState("");
  const listQuery = pathname === ADMIN_HOME.content ? searchParams.toString() : lastListQuery;
  if (listQuery !== lastListQuery) setLastListQuery(listQuery);

  const active = CONTENT_WORK_TABS.find(tab =>
    isActivePath(pathname, tab.href) || tab.related?.some(href => isActivePath(pathname, href))
  );
  if (!active) return null;

  return (
    <nav aria-label="콘텐츠 작업함 화면" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/80 p-1 sm:grid-cols-4">
      {CONTENT_WORK_TABS.map(tab => (
        <Link
          key={tab.href}
          href={tab.href === ADMIN_HOME.content && listQuery ? `${tab.href}?${listQuery}` : tab.href}
          aria-current={tab === active ? "page" : undefined}
          className={`flex min-h-11 min-w-0 items-center justify-center rounded-lg border-b-2 px-2 py-2 text-center text-sm break-keep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            tab === active
              ? "border-blue-700 bg-white font-semibold text-blue-800 shadow-sm"
              : "border-transparent font-medium text-slate-700 hover:bg-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminWorkspaceShell({ children }: AdminWorkspaceShellProps) {
  const pathname = usePathname();
  const { access } = useAdminAuthState();

  const workspace = useMemo(() => getWorkspace(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f8fafc_16%,#f8fafc_100%)] max-sm:[&_button]:min-h-11 max-sm:[&_summary]:min-h-11 max-sm:[&_select]:min-h-11 max-sm:[&_input:not([type=checkbox]):not([type=radio])]:min-h-11">
      <DashboardHeader />
      <AdminBrowserPresence />

      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-6 lg:py-3">
        <AdminSurface tone="white" className="rounded-2xl px-2 py-2 sm:px-4 sm:py-3 lg:px-2 lg:py-2">
          <div className="flex flex-col gap-1.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-2">
            {access?.isOwner && <WorkspaceNav pathname={pathname} />}
            {workspace && <SectionTabs pathname={pathname} workspace={workspace} />}
          </div>
          {access?.isOwner && <Suspense><ContentWorkNav pathname={pathname} /></Suspense>}
        </AdminSurface>

        <div className="mt-3 sm:mt-6">{children}</div>
      </div>
    </div>
  );
}
