"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading, user } = useAdminAuthState();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/login");
    }
  }, [loading, router, user]);

  if (loading && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fafc_55%,#f8fafc_100%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--color-primary)]" />
          <p className="text-base font-medium text-slate-600">관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#eef4ff_0%,#f8fafc_55%,#f8fafc_100%)] px-4">
        <AdminSurface tone="white" className="mx-4 max-w-md rounded-[1.75rem] border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </span>
          </div>
          <div className="mb-3 flex justify-center">
            <AdminPill tone="warning" className="text-[11px]">접근 제한</AdminPill>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">접근 권한 없음</h1>
          <p className="mb-2 text-base font-medium text-slate-600">관리자 계정이 아닙니다.</p>
          <p className="mb-6 text-sm leading-6 text-slate-500">현재 로그인 계정: {user?.email}</p>
          <AdminActionButton
            onClick={() => {
              import("@/lib/admin-auth").then(({ signOutAdmin }) => signOutAdmin());
              router.replace("/admin/login");
            }}
            tone="primary"
            className="px-6 py-3"
          >
            다른 계정으로 로그인
          </AdminActionButton>
        </AdminSurface>
      </div>
    );
  }

  return <>{children}</>;
}
