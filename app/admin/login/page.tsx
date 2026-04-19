"use client";

import { useEffect, useState } from "react";
import type { AuthSession } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { signOutAdmin, verifyAdminUser } from "@/lib/admin-auth";
import { CLINIC } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let handled = false;

    async function handleAdminRedirect(userEmail?: string, accessToken?: string) {
      if (handled) return;
      handled = true;
      const isAdmin = await verifyAdminUser(accessToken);
      if (cancelled) return;

      if (isAdmin) {
        try {
          localStorage.setItem("born2smile-admin", "1");
        } catch {
          // ignore private browsing failures
        }
        window.location.replace("/admin");
      } else {
        setError(`${userEmail ?? "알 수 없는 계정"} 은(는) 관리자 계정이 아닙니다.`);
        await signOutAdmin();
      }
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await handleAdminRedirect(session.user.email ?? undefined, session.access_token);
        return;
      }

      if (!cancelled) setChecking(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: AuthSession | null) => {
      if (session?.user) {
        await handleAdminRedirect(session.user.email ?? undefined, session.access_token);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.session?.access_token) {
        throw new Error("로그인 세션을 확인할 수 없습니다.");
      }

      const isAdmin = await verifyAdminUser(data.session.access_token);
      if (!isAdmin) {
        await signOutAdmin();
        setError(`${data.user?.email ?? email.trim()} 은(는) 관리자 계정이 아닙니다.`);
        return;
      }

      try {
        localStorage.setItem("born2smile-admin", "1");
      } catch {
        // ignore private browsing failures
      }
      window.location.replace("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인에 실패했습니다. 다시 시도해 주세요.");
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
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">{CLINIC.name}</h1>
          <p className="mt-2 text-base font-medium text-slate-600">운영 중심 관리자 콘솔 로그인</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Supabase 이메일/비밀번호 로그인으로 관리자 권한을 확인합니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700">
              이메일
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-blue-100"
              placeholder="관리자 이메일"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700">
              비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-blue-100"
              placeholder="비밀번호"
            />
          </div>

          <AdminActionButton
            type="submit"
            disabled={loading}
            tone="primary"
            className="w-full justify-center rounded-2xl px-4 py-3.5 text-base shadow-md shadow-blue-950/15"
          >
            {loading ? "로그인 중..." : "이메일/비밀번호로 로그인"}
          </AdminActionButton>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          등록된 관리자 이메일만 접근 가능합니다
        </div>
      </AdminSurface>
    </div>
  );
}
