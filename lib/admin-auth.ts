// =============================================================
// 관리자 인증 모듈
// Google 로그인 기반 화이트리스트 인증 (Supabase Auth)
// =============================================================

import { getSupabaseBrowserClient } from "./supabase";

/** 서버 API를 통해 관리자 권한 검증 — accessToken을 넘기면 getSession() 재호출 생략 */
export async function verifyAdminUser(accessToken?: string): Promise<boolean> {
  try {
    const token = accessToken ?? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;
    if (!token) return false;
    const response = await fetch("/api/admin/auth-check", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Google OAuth 로그인 */
export async function signInWithGoogle() {
  return getSupabaseBrowserClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/admin/login`,
      queryParams: { prompt: "select_account" },
    },
  });
}

/** 로그아웃 */
export async function signOutAdmin() {
  return getSupabaseBrowserClient().auth.signOut();
}
