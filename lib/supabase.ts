// =============================================================
// Supabase 클라이언트 (브라우저용)
// 용도: LikeButton RPC 호출 (anon key, RLS 적용)
// =============================================================

import { createBrowserClient } from "@supabase/ssr";

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}

/**
 * 현재 세션의 access_token 반환.
 * API 호출 시 Bearer 토큰으로 사용.
 * Supabase 세션 기반 인증 토큰 조회.
 */
export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다");
  return session.access_token;
}
