// =============================================================
// Firebase 클라이언트 초기화 (Firestore + Auth)
// Firestore: 좋아요 등 클라이언트 측 데이터 저장
// Auth: 관리자 대시보드 Google 로그인
// =============================================================

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "seoul-born2smile",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "seoul-born2smile"}.firebaseapp.com`,
};

export const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db: Firestore = getFirestore(app);

/**
 * Auth는 클라이언트에서만 사용.
 * 빌드 시 getAuth()가 API key를 검증하여 에러가 발생하므로 lazy 초기화.
 */
let _auth: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(app);
  return _auth;
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}
