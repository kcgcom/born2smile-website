"use client";

import { useState, useEffect } from "react";
import type { AuthSession } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signInWithGoogle, signOutAdmin, verifyAdminUser } from "@/lib/admin-auth";
import { CLINIC } from "@/lib/constants";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let handled = false;

    async function handleAdminRedirect(email?: string, accessToken?: string) {
      // PKCE 코드 교환 후 SIGNED_IN 이벤트와 init() 양쪽에서 동시에 호출되는 것을 방지
      if (handled) return;
      handled = true;
      const isAdmin = await verifyAdminUser(accessToken);
      if (cancelled) return;
      if (isAdmin) {
        try { localStorage.setItem("born2smile-admin", "1"); } catch { /* private browsing */ }
        // Full reload: Provider의 useEffect는 앱 시작 시 1회만 실행되므로
        // SPA 네비게이션으로는 새 localStorage 플래그를 감지할 수 없음
        window.location.replace("/admin");
      } else {
        setError(`${email ?? "알 수 없는 계정"} 은(는) 관리자 계정이 아닙니다.`);
        await signOutAdmin();
      }
    }

    async function init() {
      // 1) PKCE 코드 교환 — OAuth 콜백에서 ?code= 파라미터 처리
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        window.history.replaceState({}, "", window.location.pathname);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.session?.user) {
          await handleAdminRedirect(data.session.user.email ?? undefined, data.session.access_token);
          return;
        }
      }

      // 2) 기존 세션 확인 — 이미 로그인이면 /admin으로
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleAdminRedirect(session.user.email ?? undefined, session.access_token);
        return;
      }

      if (!cancelled) setChecking(false);
    }

    init();

    // 세션 변경 감지 (백업)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: AuthSession | null) => {
        if (session?.user) {
          await handleAdminRedirect(session.user.email ?? undefined, session.access_token);
        }
      },
    );

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // redirect 방식이므로 여기서 반환되지 않을 수 있음
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fafc_55%,#f8fafc_100%)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fafc_55%,#f8fafc_100%)] px-4">
      <AdminSurface
        tone="white"
        className="w-full max-w-md rounded-[1.75rem] border-white/70 bg-white/92 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-sm"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(245,158,11,0.12))] text-[var(--color-primary)]">
              <ShieldCheck className="h-7 w-7" />
            </span>
          </div>
          <div className="flex justify-center">
            <AdminPill tone="white" className="text-[11px]">관리자 전용</AdminPill>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {CLINIC.name}
          </h1>
          <p className="mt-2 text-base font-medium text-slate-600">관리자 대시보드 로그인</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            블로그 관리, 인사이트, 사이트 설정을 안전하게 관리합니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        <AdminActionButton
          onClick={handleLogin}
          disabled={loading}
          tone="primary"
          className="w-full justify-center rounded-2xl px-4 py-3.5 text-base shadow-md shadow-blue-950/15"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {loading ? "로그인 중..." : "Google 계정으로 로그인"}
        </AdminActionButton>

        <p className="mt-6 text-center text-sm leading-6 text-slate-500">
          등록된 관리자 계정만 접근 가능합니다
        </p>
      </AdminSurface>
    </div>
  );
}
