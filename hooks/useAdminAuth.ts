"use client";

import { useState, useEffect } from "react";

/**
 * 현재 사용자가 관리자인지 감지하는 훅.
 * localStorage 게이트 + dynamic import로 비관리자에게 Firebase SDK 미전송.
 * 초기값 false로 SSR/hydration 시 CLS 없음.
 */
export function useAdminAuth(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fast path: localStorage 게이트 — 비관리자는 Firebase 미로드
    try {
      if (localStorage.getItem("born2smile-admin") !== "1") return;
    } catch {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      const [
        { onAuthStateChanged },
        { getFirebaseAuth, isFirebaseConfigured },
        { verifyAdminUser },
      ] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase"),
        import("@/lib/admin-auth"),
      ]);

      if (!isFirebaseConfigured) return;

      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        void (async () => {
          const admin = await verifyAdminUser(user);
          setIsAdmin(admin);
          try {
            if (admin) localStorage.setItem("born2smile-admin", "1");
            else localStorage.removeItem("born2smile-admin");
          } catch { /* private browsing */ }
        })();
      });
    })();

    return () => unsubscribe?.();
  }, []);

  return isAdmin;
}
