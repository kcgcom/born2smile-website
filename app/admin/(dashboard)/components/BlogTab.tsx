"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FileText, BarChart3 } from "lucide-react";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";

// -------------------------------------------------------------
// 블로그 탭 — 서브탭 네비게이션 + 콘텐츠
// -------------------------------------------------------------

const SUB_TABS = [
  { id: "posts", label: "포스트", icon: FileText },
  { id: "stats", label: "통계", icon: BarChart3 },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

// -------------------------------------------------------------
// 서브탭별 코드 스플리팅
// -------------------------------------------------------------

const PostsSubTab = dynamic(
  () => import("./blog/PostsSubTab").then((m) => m.PostsSubTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const StatsSubTab = dynamic(
  () => import("./blog/StatsSubTab").then((m) => m.StatsSubTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);

// -------------------------------------------------------------

interface BlogTabProps {
  editSlug?: string | null;
  newCategory?: string | null;
}

export function BlogTab({ editSlug, newCategory }: BlogTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSub = searchParams.get("sub");
  const validSubIds = SUB_TABS.map((t) => t.id) as string[];
  const activeSub: SubTabId = validSubIds.includes(rawSub ?? "")
    ? (rawSub as SubTabId)
    : "posts";

  const handleSubChange = (sub: SubTabId) => {
    router.replace(`${pathname}?tab=blog&sub=${sub}`);
  };

  return (
    <div>
      {/* 서브탭 네비게이션 */}
      <nav
        className="mb-6 flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="블로그 서브탭"
      >
        {SUB_TABS.map((tab) => {
          const isActive = tab.id === activeSub;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              title={tab.label}
              onClick={() => handleSubChange(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-600 text-white"
                  : "text-[var(--muted)] hover:bg-[var(--background)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 서브탭 콘텐츠 */}
      {activeSub === "posts" && <PostsSubTab editSlug={editSlug} newCategory={newCategory} />}
      {activeSub === "stats" && <StatsSubTab />}
    </div>
  );
}
