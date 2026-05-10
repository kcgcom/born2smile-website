import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * 서버 컴포넌트에서 현재 요청이 관리자인지 확인합니다.
 * Supabase Auth 세션 쿠키를 읽어 이메일 화이트리스트와 대조합니다.
 */
export async function getIsAdminServer(): Promise<boolean> {
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
    if (!user?.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
  } catch {
    return false;
  }
}
