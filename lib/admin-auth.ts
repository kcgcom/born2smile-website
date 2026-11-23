// =============================================================
// 관리자 인증 모듈
// Google 로그인 기반 화이트리스트 인증 (Supabase Auth)
// =============================================================

import { getSupabaseBrowserClient } from "./supabase";
import type { AdminAccess } from "./admin-access";

/** 서버 API를 통해 관리자 권한 검증 — accessToken을 넘기면 getSession() 재호출 생략 */
export async function fetchAdminAccess(accessToken?: string): Promise<AdminAccess | null> {
  try {
    const token = accessToken ?? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;
    if (!token) return null;
    const response = await fetch("/api/admin/auth-check", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const { access } = await response.json();
    return typeof access?.isOwner === "boolean" ? { isOwner: access.isOwner } : null;
  } catch {
    return null;
  }
}

/** 로그아웃 */
export async function signOutAdmin() {
  return getSupabaseBrowserClient().auth.signOut();
}
