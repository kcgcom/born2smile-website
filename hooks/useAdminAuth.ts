"use client";

import { useState, useEffect } from "react";
import type { AuthSession } from "@supabase/supabase-js";

/**
 * 현재 사용자가 관리자인지 감지하는 훅.
 * localStorage 게이트 + dynamic import로 비관리자에게 Supabase SDK 미전송.
 * 초기값 false로 SSR/hydration 시 CLS 없음.
 */
export function useAdminAuth(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 비관리자(99%+)는 localStorage 게이트에서 즉시 종료 — Supabase SDK 미로드
    // 관리자는 검증 완료 전에도 즉시 표시: admin API는 서버에서 독립 검증하므로 UI 노출은 무해
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
      setIsAdmin(true);
    } catch {
      return;
    }

    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      const [{ getSupabaseBrowserClient, isSupabaseConfigured }, { verifyAdminUser }] =
        await Promise.all([
          import("@/lib/supabase"),
          import("@/lib/admin-auth"),
        ]);

      if (!isSupabaseConfigured) return;

      const supabase = getSupabaseBrowserClient();

      const setAdminFlag = (value: boolean) => {
        try {
          if (value) localStorage.setItem("born2smile-admin", "1");
          else localStorage.removeItem("born2smile-admin");
        } catch {}
      };

      // onAuthStateChange만 사용 — INITIAL_SESSION 이벤트로 초기 세션 처리
      // getSession() 병행 시 verifyAdminUser가 이중 호출됨 (AuthGuard와 동일한 패턴)
      const { data } = supabase.auth.onAuthStateChange(async (event: string, session: AuthSession | null) => {
        if (session) {
          const stillAdmin = await verifyAdminUser(session.access_token);
          setIsAdmin(stillAdmin);
          setAdminFlag(stillAdmin);
        } else if (event === "SIGNED_OUT") {
          // 명시적 로그아웃 시에만 플래그 제거
          // INITIAL_SESSION null은 일시적일 수 있으므로 플래그 유지
          setIsAdmin(false);
          setAdminFlag(false);
        }
      });
      subscription = data.subscription;
    })();

    return () => subscription?.unsubscribe();
  }, []);

  return isAdmin;
}
