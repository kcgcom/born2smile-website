import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapPlannerRow, updatePlannerItemSchema } from "@/lib/content-planner";
import { cancelContentReevaluation, requestContentReevaluation, withContentReevaluationState } from "@/lib/content-coverage/reevaluation-store";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const parsed = updatePlannerItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", message: "수정할 작업 정보가 올바르지 않습니다", issues: parsed.error.issues },
      { status: 400, headers: HEADERS },
    );
  }

  const { id } = await params;
  const updates = {
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
    ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("content_planner_items")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const item = mapPlannerRow(data);
    const reevaluation = parsed.data.status === "published"
      ? await requestContentReevaluation(item, auth.email)
      : parsed.data.status !== undefined ? await cancelContentReevaluation(item, auth.email) : null;
    return Response.json({ data: withContentReevaluationState(item, reevaluation) }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "콘텐츠 플래너 작업을 수정할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
