"use client";

import { useState, useEffect } from "react";

/**
 * 현재 사용자가 관리자인지 감지하는 훅.
 * localStorage 게이트 + dynamic import로 비관리자에게 Supabase SDK 미전송.
 * 초기값 false로 SSR/hydration 시 CLS 없음.
 */
export function useAdminAuth(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fast path: localStorage 게이트 — 비관리자는 Supabase 미로드
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
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

      // 초기 확인
      const admin = await verifyAdminUser();
      setIsAdmin(admin);
      if (!admin) {
        try { localStorage.removeItem("born2smile-admin"); } catch {}
        return;
      }

      // 세션 변경 감지
      const { data } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: { email?: string | null } } | null) => {
        if (session) {
          const stillAdmin = await verifyAdminUser();
          setIsAdmin(stillAdmin);
          try {
            if (stillAdmin) localStorage.setItem("born2smile-admin", "1");
            else localStorage.removeItem("born2smile-admin");
          } catch {}
        } else {
          setIsAdmin(false);
          try { localStorage.removeItem("born2smile-admin"); } catch {}
        }
      });
      subscription = data.subscription;
    })();

    return () => subscription?.unsubscribe();
  }, []);

  return isAdmin;
}
