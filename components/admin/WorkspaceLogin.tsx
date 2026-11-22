"use client";

import { useEffect, useState } from "react";
import type { AuthSession } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { signOutAdmin, fetchAdminAccess } from "@/lib/admin-auth";
import { getStaffHome } from "@/lib/admin-access";
import { CLINIC } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function WorkspaceLogin({ staff = false }: { staff?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let handled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 4000);

    async function handleAdminRedirect(email?: string, accessToken?: string) {
      if (handled) return;
      handled = true;
      const access = await fetchAdminAccess(accessToken);
      if (cancelled) return;

      if (access) {
        try {
          localStorage.setItem("born2smile-admin", "1");
        } catch {
          // ignore private browsing failures
        }
        window.location.replace(staff || !access.isOwner ? getStaffHome(access) : "/admin");
      } else {
        setError(`${email ?? "현재 계정"}으로 접속할 수 없습니다. 등록된 계정인지 확인해 주세요.`);
        await signOutAdmin();
        handled = false;
        if (!cancelled) setChecking(false);
      }
    }

    async function init() {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (!staff && code) {
          window.history.replaceState({}, "", window.location.pathname);
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && data.session?.user) {
            await handleAdminRedirect(data.session.user.email ?? undefined, data.session.access_token);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await handleAdminRedirect(session.user.email ?? undefined, session.access_token);
          return;
        }
      } catch {
        // fall through to manual login UI
      }

      if (!cancelled) setChecking(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: AuthSession | null) => {
      if (session?.user) {
        void setTimeout(() => {
          if (!cancelled) void handleAdminRedirect(session.user.email ?? undefined, session.access_token);
        }, 0);
      } else if (!cancelled) {
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [staff]);

  const handlePasswordLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: loginError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) setError("이메일 또는 비밀번호를 확인해 주세요.");
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setPassword("");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin/login`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (loginError) throw loginError;
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
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[var(--color-primary)]"><ShieldCheck aria-hidden="true" className="h-7 w-7" /></span>
          </div>
          <div className="flex justify-center">
            <AdminPill tone="white" className="text-[11px]">관리자 전용</AdminPill>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">{CLINIC.name}</h1>
          <p className="mt-2 text-base font-medium text-slate-600">{staff ? "직원 업무 로그인" : "원장 관리 로그인"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            블로그 관리, 인사이트, 전환, 설정을 한 흐름으로 운영할 수 있습니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {staff ? <form className="mb-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void handlePasswordLogin(); }}>
          <label className="flex flex-col gap-1 text-sm font-medium">이메일
            <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 focus-visible:outline-2 focus-visible:outline-blue-700" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">비밀번호
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3 focus-visible:outline-2 focus-visible:outline-blue-700" />
          </label>
          <AdminActionButton type="submit" disabled={loading} tone="primary" className="w-full justify-center">로그인</AdminActionButton>
        </form> :

          <AdminActionButton
            onClick={handleLogin}
            disabled={loading}
            tone="primary"
            className="mt-2 w-full justify-center rounded-2xl px-4 py-3.5 text-base shadow-md shadow-blue-950/15"
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
            Google 로그인
          </AdminActionButton>}

        <div className="mt-4 text-center text-sm text-slate-500">
          등록된 관리자 계정만 접근 가능합니다
        </div>
      </AdminSurface>
    </div>
  );
}
