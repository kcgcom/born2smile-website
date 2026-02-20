// =============================================================
// 관리자 인증 모듈
// Google 로그인 기반 화이트리스트 인증
// =============================================================

import { signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "./firebase";

const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? ""
)
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/** 관리자 이메일 화이트리스트 검증 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email);
}

/** Google 팝업 로그인 */
export async function signInWithGoogle() {
  return signInWithPopup(getFirebaseAuth(), getGoogleProvider());
}

/** 로그아웃 */
export async function signOutAdmin() {
  return signOut(getFirebaseAuth());
}
