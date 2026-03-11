// =============================================================
// 관리자 인증 모듈
// Google 로그인 기반 화이트리스트 인증 (Supabase Auth)
// =============================================================

import { getSupabaseBrowserClient } from "./supabase";

/** 서버 API를 통해 관리자 권한 검증 */
export async function verifyAdminUser(): Promise<boolean> {
  try {
    const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
    if (!session?.access_token) return false;
    const response = await fetch("/api/admin/auth-check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
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
    options: { redirectTo: `${window.location.origin}/admin/login` },
  });
}

/** 로그아웃 */
export async function signOutAdmin() {
  return getSupabaseBrowserClient().auth.signOut();
}
