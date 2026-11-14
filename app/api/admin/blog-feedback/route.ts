import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    const data = await createCachedFetcher("blog-question-feedback", async () => {
      const { data: rows, error } = await getSupabaseAdmin().rpc("get_blog_question_feedback_stats");
      if (error) throw error;
      const feedback: Record<string, { solved: number; unresolved: number; total: number }> = {};
      let totalResponses = 0;
      for (const row of rows ?? []) {
        const solved = Number(row.solved), unresolved = Number(row.unresolved);
        feedback[row.slug] = { solved, unresolved, total: solved + unresolved };
        totalResponses += solved + unresolved;
      }
      return { feedback, totalResponses, updatedAt: new Date().toISOString() };
    }, CACHE_TTL.POSTHOG)();
    return Response.json({ data }, { headers });
  } catch {
    return Response.json({ error: "API_ERROR", message: "질문 해결 피드백을 불러올 수 없습니다." }, { status: 503, headers });
  }
}
