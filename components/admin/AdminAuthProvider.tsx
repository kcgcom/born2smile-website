"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthSession } from "@supabase/supabase-js";

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  user: { email?: string } | null;
}

const AdminAuthContext = createContext<AdminAuthState>({
  isAdmin: false,
  loading: true,
  user: null,
});

/**
 * 앱 전체에서 관리자 인증 상태를 공유하는 Provider.
 * useEffect 1회만 실행 → onAuthStateChange 구독 1개 → verifyAdminUser HTTP 호출 1번.
 * 비관리자(99%+)는 localStorage 게이트에서 즉시 종료 — Supabase SDK 미로드.
 * 관리자는 검증 완료 전에도 즉시 표시: admin API가 서버에서 독립 검증하므로 UI 노출은 무해.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    let hasFlag = false;
    try {
      hasFlag = localStorage.getItem("born2smile-admin") === "1";
      if (hasFlag) setIsAdmin(true);
    } catch {}

    if (!hasFlag) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      const [{ getSupabaseBrowserClient, isSupabaseConfigured }, { verifyAdminUser }] =
        await Promise.all([
          import("@/lib/supabase"),
          import("@/lib/admin-auth"),
        ]);

      if (cancelled) return;

      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      const setAdminFlag = (value: boolean) => {
        try {
          if (value) localStorage.setItem("born2smile-admin", "1");
          else localStorage.removeItem("born2smile-admin");
        } catch {}
      };

      // onAuthStateChange만 사용 — INITIAL_SESSION 이벤트로 초기 세션 처리
      // SIGNED_OUT 외의 null 세션(INITIAL_SESSION 등)은 일시적일 수 있으므로 플래그 유지
      const { data } = supabase.auth.onAuthStateChange(async (event: string, session: AuthSession | null) => {
        if (session?.user) {
          setUser({ email: session.user.email ?? undefined });
          const admin = await verifyAdminUser(session.access_token);
          setIsAdmin(admin);
          setAdminFlag(admin);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setIsAdmin(false);
          setAdminFlag(false);
        }
        setLoading(false);
      });

      subscription = data.subscription;
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AdminAuthContext value={{ isAdmin, loading, user }}>
      {children}
    </AdminAuthContext>
  );
}

/** 관리자 여부만 필요한 컴포넌트용 (AdminFloatingButton, AdminEditButton 등) */
export function useAdminAuth(): boolean {
  return useContext(AdminAuthContext).isAdmin;
}

/** 전체 인증 상태가 필요한 컴포넌트용 (AuthGuard) */
export function useAdminAuthState(): AdminAuthState {
  return useContext(AdminAuthContext);
}
