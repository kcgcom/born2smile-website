import { getLlmsText } from "@/lib/llms-text";
import { getSiteClinic, getSiteHours, getSiteLinks } from "@/lib/site-config-supabase";

// 공개 페이지와 같은 설정 캐시를 사용해 설정 변경 시 태그 무효화가 적용된다.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const [clinic, hours, links] = await Promise.all([
    getSiteClinic(), getSiteHours(), getSiteLinks(),
  ]);
  return new Response(getLlmsText({ clinic, hours, links }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
