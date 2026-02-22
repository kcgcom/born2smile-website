"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/admin-auth";

/**
 * 현재 사용자가 관리자인지 감지하는 훅.
 * Firebase Auth의 onAuthStateChanged 리스너를 사용하며,
 * 초기값 false로 SSR/hydration 시 CLS 없음.
 */
export function useAdminAuth(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      const admin = !!user && isAdminEmail(user.email);
      setIsAdmin(admin);
      try {
        if (admin) localStorage.setItem("born2smile-admin", "1");
        else localStorage.removeItem("born2smile-admin");
      } catch { /* SSR / private browsing */ }
    });
    return unsubscribe;
  }, []);

  return isAdmin;
}
