// =============================================================
// 관리자 인증 모듈
// Google 로그인 기반 화이트리스트 인증
// =============================================================

import { signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "./firebase";

/** 서버 API를 통해 관리자 권한 검증 */
export async function verifyAdminUser(user: { getIdToken: () => Promise<string> } | null | undefined): Promise<boolean> {
  if (!user) return false;
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/admin/auth-check", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Google 팝업 로그인 */
export async function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), getGoogleProvider());
}

/** 로그아웃 */
export async function signOutAdmin() {
  return signOut(getFirebaseAuth());
}
