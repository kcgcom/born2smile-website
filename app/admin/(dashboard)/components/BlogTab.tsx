"use client";

import dynamic from "next/dynamic";
import { FileText, BarChart3 } from "lucide-react";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { SubTabNav, useSubTab } from "./SubTabNav";

// -------------------------------------------------------------
// 블로그 탭 — 서브탭 네비게이션 + 콘텐츠
// -------------------------------------------------------------

const SUB_TABS = [
  { id: "posts", label: "포스트", icon: FileText },
  { id: "stats", label: "통계", icon: BarChart3 },
] as const;

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
  const activeSub = useSubTab(SUB_TABS, "posts");

  return (
    <div>
      <SubTabNav tabs={SUB_TABS} parentTab="blog" defaultSub="posts" ariaLabel="블로그 서브탭" />

      {/* 서브탭 콘텐츠 */}
      {activeSub === "posts" && <PostsSubTab editSlug={editSlug} newCategory={newCategory} />}
      {activeSub === "stats" && <StatsSubTab />}
    </div>
  );
}
