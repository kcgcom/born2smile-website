"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import type { AuthSession } from "@supabase/supabase-js";

/**
 * 관리자 로그인 시 모든 공개 페이지에 표시되는 플로팅 버튼.
 * 클릭하면 /admin 대시보드로 이동.
 * /admin 경로에서는 자동 숨김.
 *
 * 성능 최적화: Supabase SDK를 localStorage 게이트 + 동적 import로 lazy-load.
 * 비관리자 방문자(99%+)는 Supabase SDK를 절대 다운로드하지 않음.
 */
export function AdminFloatingButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Fast path: 관리자 플래그 없으면 Supabase 로드 없이 즉시 리턴
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
      setIsAdmin(true); // 플래그 있으면 즉시 표시 (검증은 백그라운드)
    } catch {
      return;
    }

    // 백그라운드 검증: Supabase 세션이 유효한지 확인
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      const [{ getSupabaseBrowserClient }, { verifyAdminUser }] =
        await Promise.all([
          import("@/lib/supabase"),
          import("@/lib/admin-auth"),
        ]);

      const supabase = getSupabaseBrowserClient();

      const setAdminFlag = (value: boolean) => {
        try {
          if (value) localStorage.setItem("born2smile-admin", "1");
          else localStorage.removeItem("born2smile-admin");
        } catch { /* private browsing */ }
      };

      // onAuthStateChange만 사용 — INITIAL_SESSION 이벤트로 초기 세션 처리
      // SIGNED_OUT 외의 null 세션(INITIAL_SESSION 등)은 일시적일 수 있으므로 플래그 유지
      const { data } = supabase.auth.onAuthStateChange(async (_event: string, session: AuthSession | null) => {
        if (session) {
          const admin = await verifyAdminUser(session.access_token);
          setIsAdmin(admin);
          setAdminFlag(admin);
        } else if (_event === "SIGNED_OUT") {
          setIsAdmin(false);
          setAdminFlag(false);
        }
      });
      subscription = data.subscription;
    })();

    return () => subscription?.unsubscribe();
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
