import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { resolveAdminAccess } from "./admin-account-store";
import { hasPasswordAuthentication } from "./admin-access";

/**
 * 서버 컴포넌트에서 현재 요청이 관리자인지 확인합니다.
 * Supabase Auth 세션 쿠키를 읽어 이메일 화이트리스트와 대조합니다.
 */
export async function getAdminAccessServer() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const access = await resolveAdminAccess(user?.email);
    if (!access || access.isOwner) return access;
    const { data, error } = await supabase.auth.getClaims();
    return !error && hasPasswordAuthentication(data?.claims.amr) ? access : null;
  } catch {
    return null;
  }
}

export async function getIsAdminServer(): Promise<boolean> {
  return (await getAdminAccessServer())?.isOwner === true;
}
