import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createPlannerItemSchema, mapPlannerRow } from "@/lib/content-planner";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("content_planner_items")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data: (data ?? []).map(mapPlannerRow) }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "콘텐츠 플래너 작업을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const parsed = createPlannerItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", message: "플래너 작업 정보가 올바르지 않습니다", issues: parsed.error.issues },
      { status: 400, headers: HEADERS },
    );
  }

  const item = parsed.data;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("content_planner_items")
      .upsert({
        opportunity_key: item.opportunityKey,
        item_type: item.itemType,
        title: item.title,
        category: item.category,
        target_page: item.targetPage,
        status: item.status,
        priority: item.priority,
        rationale: item.rationale,
        brief: item.brief,
        source_snapshot: item.sourceSnapshot,
        due_date: item.dueDate,
        created_by: auth.email,
        updated_at: new Date().toISOString(),
      }, { onConflict: "opportunity_key" })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ data: mapPlannerRow(data) }, { status: 201, headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "콘텐츠 플래너 작업을 저장할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
