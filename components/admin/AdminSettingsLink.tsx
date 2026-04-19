"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import type { AuthSession } from "@supabase/supabase-js";
import { AdminActionLink } from "@/components/admin/AdminChrome";

interface AdminSettingsLinkProps {
  href?: string;
}

/**
 * 관리자에게만 보이는 설정 편집 링크.
 * Footer 등 서버 컴포넌트의 설정 영역에 삽입하여 사용.
 *
 * 성능 최적화: localStorage 게이트 + 동적 Supabase import로
 * 비관리자 방문자는 Supabase SDK를 로드하지 않음.
 */
export function AdminSettingsLink({ href = "/admin/system/settings" }: AdminSettingsLinkProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
    } catch {
      return;
    }

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
      const { data } = supabase.auth.onAuthStateChange(async (_event: string, session: AuthSession | null) => {
        const admin = session ? await verifyAdminUser(session.access_token) : false;
        setIsAdmin(admin);
        setAdminFlag(admin);
      });
      subscription = data.subscription;
    })();

    return () => subscription?.unsubscribe();
  }, []);

  if (!isAdmin) return null;

  return (
    <AdminActionLink
      href={href}
      tone="dark"
      className="rounded-full px-2.5 py-1 text-xs font-medium"
      title="설정 편집"
    >
      <Pencil size={11} aria-hidden="true" />
      편집
    </AdminActionLink>
  );
}
