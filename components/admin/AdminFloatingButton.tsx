"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminChrome";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * 관리자 로그인 시 모든 공개 페이지에 표시되는 플로팅 버튼.
 * 클릭하면 /admin 대시보드로 이동.
 * /admin 경로에서는 자동 숨김.
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

  if (!isAdmin || pathname.startsWith("/admin") || isBlogEditMode) return null;

  return (
    <AdminActionLink
      href="/admin"
      tone="ghost"
      className="fixed bottom-20 left-4 z-50 h-11 w-11 rounded-full !border-slate-700/50 !bg-slate-950/88 p-0 !text-white shadow-lg shadow-slate-950/20 backdrop-blur-md transition-transform hover:scale-110 hover:!bg-slate-900/92 md:bottom-6 md:left-6 md:h-12 md:w-12"
      aria-label="관리자 대시보드"
      title="관리자 대시보드"
    >
      <Settings size={20} aria-hidden="true" />
    </AdminActionLink>
  );
}
