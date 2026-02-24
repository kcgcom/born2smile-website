"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

interface AdminSettingsLinkProps {
  tab?: string;
}

/**
 * 관리자에게만 보이는 설정 편집 링크.
 * Footer 등 서버 컴포넌트의 설정 영역에 삽입하여 사용.
 *
 * 성능 최적화: localStorage 게이트 + 동적 Firebase import로
 * 비관리자 방문자는 Firebase SDK를 로드하지 않음.
 */
export function AdminSettingsLink({ tab = "settings" }: AdminSettingsLinkProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
    } catch {
      return;
    }

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

  if (!isAdmin) return null;

  return (
    <Link
      href={`/admin?tab=${tab}`}
      className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
      title="설정 편집"
    >
      <Pencil size={11} aria-hidden="true" />
      편집
    </Link>
  );
}
