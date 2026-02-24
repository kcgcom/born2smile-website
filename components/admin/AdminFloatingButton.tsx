"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

/**
 * 관리자 로그인 시 모든 공개 페이지에 표시되는 플로팅 버튼.
 * 클릭하면 /admin 대시보드로 이동.
 * /admin 경로에서는 자동 숨김.
 *
 * 성능 최적화: Firebase SDK를 localStorage 게이트 + 동적 import로 lazy-load.
 * 비관리자 방문자(99%+)는 Firebase SDK를 절대 다운로드하지 않음 (~117 KiB 절감).
 */
export function AdminFloatingButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Fast path: 관리자 플래그 없으면 Firebase 로드 없이 즉시 리턴
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
    } catch {
      return;
    }

    // 관리자 플래그가 있을 때만 Firebase Auth를 동적 로드
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const [{ onAuthStateChanged }, { getFirebaseAuth, isFirebaseConfigured }, { isAdminEmail }] =
        await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase"),
          import("@/lib/admin-auth"),
        ]);

      if (!isFirebaseConfigured) return;

      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        const admin = !!user && isAdminEmail(user.email);
        setIsAdmin(admin);
        try {
          if (admin) localStorage.setItem("born2smile-admin", "1");
          else localStorage.removeItem("born2smile-admin");
        } catch {
          /* private browsing */
        }
      });
    })();

    return () => unsubscribe?.();
  }, []);

  if (!isAdmin || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/admin"
      className="fixed bottom-20 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-gray-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-gray-500 md:bottom-6 md:left-6 md:h-12 md:w-12"
      aria-label="관리자 대시보드"
      title="관리자 대시보드"
    >
      <Settings size={20} aria-hidden="true" />
    </Link>
  );
}
