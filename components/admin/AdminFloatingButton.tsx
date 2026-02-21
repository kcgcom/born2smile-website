"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * 관리자 로그인 시 모든 공개 페이지에 표시되는 플로팅 버튼.
 * 클릭하면 /admin 대시보드로 이동.
 * /admin 경로에서는 자동 숨김.
 */
export function AdminFloatingButton() {
  const isAdmin = useAdminAuth();
  const pathname = usePathname();

  if (!isAdmin || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/admin"
      className="fixed bottom-20 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-transform hover:scale-110 hover:bg-gray-700 md:bottom-6 md:left-6 md:h-12 md:w-12"
      aria-label="관리자 대시보드"
      title="관리자 대시보드"
    >
      <Settings size={20} aria-hidden="true" />
    </Link>
  );
}
