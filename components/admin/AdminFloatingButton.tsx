"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminChrome";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * 관리자 로그인 시 모든 페이지에 표시되는 플로팅 버튼.
 * - 공개 페이지: Settings 아이콘 → /admin 운영 콘솔로 이동
 * - 관리자 페이지: Home 아이콘 → / 홈으로 이동
 *
 * 성능 최적화: useAdminAuth가 localStorage 게이트 + 동적 import로 비관리자에게 Supabase SDK 미전송.
 */
export function AdminFloatingButton() {
  const isAdmin = useAdminAuth();
  const pathname = usePathname();
  const [isBlogEditMode, setIsBlogEditMode] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsBlogEditMode(document.documentElement.dataset.blogEditMode === "1");
    };

    const handleModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      setIsBlogEditMode(Boolean(customEvent.detail?.active));
    };

    sync();
    window.addEventListener("born2smile:blog-edit-mode", handleModeChange);
    return () => window.removeEventListener("born2smile:blog-edit-mode", handleModeChange);
  }, []);

  if (!isAdmin || isBlogEditMode || pathname.startsWith("/admin")) return null;

  const href = pathname.startsWith("/blog") ? "/admin?tab=content&sub=posts" : "/admin";

  return (
    <AdminActionLink
      href={href}
      tone="ghost"
      className="fixed bottom-20 left-4 z-50 h-14 w-14 rounded-full !border-slate-600/40 !bg-slate-700/85 p-0 !text-white shadow-lg shadow-slate-950/20 backdrop-blur-md transition-transform hover:scale-110 hover:!bg-slate-600/90 md:bottom-6 md:left-6"
      aria-label="관리자 콘솔"
      title="관리자 콘솔"
    >
      <Settings size={24} aria-hidden="true" />
    </AdminActionLink>
  );
}
