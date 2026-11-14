import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { classifyFeedbackAuth, handleFeedback } from "@/lib/blog-feedback-server";
import { getTodayKST } from "@/lib/date";

export async function POST(request: Request) {
  return handleFeedback(request, {
    authenticate: async (req) => {
      const cookieStore = await cookies();
      const authorization = req.headers.get("authorization");
      if (authorization && !authorization.startsWith("Bearer ")) return "invalid";
      return classifyFeedbackAuth({
        adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean),
        tokens: authorization ? [authorization.slice(7)] : [],
        cliSecret: process.env.ADMIN_CLI_SECRET,
        hasSessionCookie: cookieStore.getAll().some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name)),
        resolveToken: async token => {
          const { data, error } = await getSupabaseAdmin().auth.getUser(token);
          return error ? null : data.user;
        },
        resolveCookie: async () => {
          const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
          });
          const { data, error } = await client.auth.getUser();
          return error ? null : data.user;
        },
      });
    },
    publicPost: async slug => {
      const { data, error } = await getSupabaseAdmin().from("blog_posts").select("slug").eq("slug", slug).eq("published", true).lte("date", getTodayKST()).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    save: async ({ slug, visitorHash, answer, reason }) => {
      const { data, error } = await getSupabaseAdmin().from("blog_question_feedback")
        .upsert({ slug, visitor_hash: visitorHash, answer, reason }, { onConflict: "slug,visitor_hash" })
        .select("id,updated_at").single();
      if (error || !data) throw error ?? new Error("Missing feedback result");
      return data;
    },
  });
}
