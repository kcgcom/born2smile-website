"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { signOutAdmin } from "@/lib/admin-auth";
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
  tabs?: NavItem[];
}

const PERFORMANCE_PATH = "/admin/system/monitoring";
const MOBILE_PSI_ENDPOINT = "/api/dev/pagespeed?strategy=mobile";
const INDEXING_PATH = "/admin/analysis/indexing";
const INDEXING_ENDPOINT = "/api/admin/indexing-status";

function preloadTabData(href: string) {
  if (href === PERFORMANCE_PATH) preloadAdminApi(MOBILE_PSI_ENDPOINT);
  if (href === INDEXING_PATH) preloadAdminApi(INDEXING_ENDPOINT);
}

const WORKSPACES: WorkspaceConfig[] = [
  {
    id: "operations",
    href: "/admin/operations/overview",
    label: "운영",
    icon: LayoutDashboard,
    tabs: [
      { href: "/admin/operations/overview", label: "오늘 할 일", icon: LayoutDashboard },
      { href: "/admin/content/tasks", label: "작업함", icon: KanbanSquare, aliases: ["/admin/content/planner"] },
      { href: "/admin/content/posts", label: "포스트", icon: FileText, aliases: ["/admin/content/revisions"] },
      { href: "/admin/content/schedule", label: "발행 일정", icon: Activity },
      { href: "/admin/content/images", label: "이미지", icon: Image },
    ],
  },
  {
    id: "performance",
    href: "/admin/analysis/search",
    label: "성과",
    icon: BarChart3,
    tabs: [
      { href: "/admin/analysis/search", label: "검색 성과", icon: Search },
      { href: "/admin/analysis/traffic", label: "방문·읽기", icon: BarChart3 },
      { href: "/admin/operations/conversion", label: "문의·공유", icon: MousePointerClick },
      { href: "/admin/analysis/indexing", label: "색인 상태", icon: ScanSearch },
    ],
  },
  {
    id: "site",
    href: "/admin/system/settings",
    label: "사이트 관리",
    icon: Settings,
    tabs: [
      { href: "/admin/system/settings", label: "병원 정보·진료시간", icon: Settings },
      { href: "/admin/system/monitoring", label: "사이트 성능", icon: Gauge },
    ],
  },
];

const TOOL_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "기획·분석 자료", items: [
    { href: "/admin/content/strategy", label: "기회 분석", icon: Target },
    { href: "/admin/content/trends", label: "검색 트렌드·키워드 관리", icon: TrendingUp },
  ] },
  { label: "추천·근거 검토", items: [
    { href: "/admin/content/strategy/actions", label: "콘텐츠 행동추천", icon: ClipboardCheck },
    { href: "/admin/content/strategy/retrieval-review", label: "검색 근거 검토", icon: ScanSearch },
    { href: "/admin/content/strategy/concept-review", label: "개념별 근거 검토", icon: ClipboardCheck },
    { href: "/admin/content/strategy/reevaluation-review", label: "변경 후 재평가", icon: Activity },
    { href: "/admin/content/trends/keyword-evaluation", label: "키워드 초기 평가", icon: Search },
    { href: "/admin/content/trends/keyword-evaluation/shadow-audit", label: "키워드 독립 감사", icon: ClipboardCheck },
    { href: "/admin/content/trends/keyword-evaluation/boundary-review", label: "키워드 경계 검토", icon: ScanSearch },
  ] },
  { label: "개발 도구", items: [
    { href: "/admin/system/devtools/project", label: "프로젝트 현황", icon: ClipboardCheck },
    { href: "/admin/system/devtools/ref", label: "레퍼런스", icon: BookOpen },
  ] },
];

const TOOL_ITEMS = TOOL_GROUPS.flatMap((group) => group.items);

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isWorkspaceActive(pathname: string, workspace: WorkspaceConfig) {
  if (isActivePath(pathname, workspace.href)) {
    return true;
  }

  return workspace.tabs?.some((tab) => isItemActive(pathname, tab)) ?? false;
}

function isItemActive(pathname: string, item: NavItem) {
  return isActivePath(pathname, item.href) || Boolean(item.aliases?.some(path => isActivePath(pathname, path)));
}

function getWorkspace(pathname: string) {
  return WORKSPACES.find((workspace) => isWorkspaceActive(pathname, workspace));
}

function getActiveTool(pathname: string) {
  return TOOL_ITEMS.filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

function AuxiliaryTools({ pathname }: { pathname: string }) {
  const active = getActiveTool(pathname);
  return (
    <details className="relative rounded-xl border border-slate-200 bg-slate-50 px-2 lg:ml-auto lg:shrink-0" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary className="min-h-11 cursor-pointer rounded-lg px-1 py-3 text-xs font-medium text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        보조 도구{active ? ` · ${active.label}` : ""}
      </summary>
      <nav aria-label="관리자 보조 도구" className="mt-3 grid gap-5 pb-3 lg:absolute lg:right-0 lg:top-full lg:z-40 lg:w-[min(760px,calc(100vw-4rem))] lg:grid-cols-3 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-4 lg:shadow-xl">
        {TOOL_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="mb-2 text-xs font-semibold text-slate-500">{group.label}</h2>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = item.href === active?.href;
                return <li key={item.href}><Link href={item.href} aria-current={selected ? "page" : undefined} className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${selected ? "bg-white font-semibold text-blue-800 shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}><Icon size={14} aria-hidden="true" />{item.label}</Link></li>;
              })}
            </ul>
          </section>
        ))}
      </nav>
    </details>
  );
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/80 p-1 lg:flex lg:shrink-0"
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
      <div className={`grid gap-1 ${workspace.tabs.length === 2 ? "grid-cols-2" : workspace.tabs.length === 5 ? "grid-cols-5" : "grid-cols-4"} lg:flex`}>
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
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-normal rounded-lg border-b-2 border-transparent px-1 py-2 text-center text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-3 lg:flex-1 lg:whitespace-nowrap ${
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

export function AdminWorkspaceShell({ children }: AdminWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const workspace = useMemo(() => getWorkspace(pathname), [pathname]);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f8fafc_16%,#f8fafc_100%)] max-sm:[&_button]:min-h-11 max-sm:[&_summary]:min-h-11 max-sm:[&_select]:min-h-11 max-sm:[&_input:not([type=checkbox]):not([type=radio])]:min-h-11">
      <DashboardHeader onLogout={handleLogout} />

      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-6 lg:py-3">
        <AdminSurface tone="white" className="rounded-2xl px-2 py-2 sm:px-4 sm:py-3 lg:px-2 lg:py-2">
          <div className="flex flex-col gap-1.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-2">
            <WorkspaceNav pathname={pathname} />
            {workspace && <SectionTabs pathname={pathname} workspace={workspace} />}
            <AuxiliaryTools key={pathname} pathname={pathname} />
          </div>
        </AdminSurface>

        <div className="mt-3 sm:mt-6">{children}</div>
      </div>
    </div>
  );
}
