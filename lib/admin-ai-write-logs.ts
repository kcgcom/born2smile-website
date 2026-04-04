import { getSupabaseAdmin } from "./supabase-admin";

const TABLE = "ai_write_logs";
export const AI_WRITE_LOG_RETENTION_DAYS = 30;

let lastPruneAttemptAt = 0;

export interface AiWriteLogRow {
  id: number;
  requested_at: string;
  completed_at: string | null;
  user_email: string;
  mode: "chat" | "generate";
  model: string;
  message_count: number;
  input_chars: number;
  output_bytes: number;
  duration_ms: number | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
}

function getCutoffIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function insertAiWriteLog(row: Omit<AiWriteLogRow, "id">) {
  const { error } = await getSupabaseAdmin().from(TABLE).insert(row);
  if (error) throw error;
}

export async function getAiWriteLogs(limit = 30, days = AI_WRITE_LOG_RETENTION_DAYS) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeDays = Math.max(days, 1);
  const admin = getSupabaseAdmin();
  const dayAgoIso = getCutoffIso(1);
  const cutoffIso = getCutoffIso(safeDays);

  const [logsRes, totalRes, last24hRes, failures24hRes] = await Promise.all([
    admin
      .from(TABLE)
      .select("*")
      .gte("requested_at", cutoffIso)
      .order("requested_at", { ascending: false })
      .limit(safeLimit),
    admin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("requested_at", cutoffIso),
    admin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("requested_at", dayAgoIso),
    admin
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("requested_at", dayAgoIso)
      .eq("success", false),
  ]);

  if (logsRes.error) throw logsRes.error;
  if (totalRes.error) throw totalRes.error;
  if (last24hRes.error) throw last24hRes.error;
  if (failures24hRes.error) throw failures24hRes.error;

  const logs = (logsRes.data ?? []) as AiWriteLogRow[];
  const latest = logs[0] ?? null;

  return {
    logs,
    summary: {
      total: totalRes.count ?? 0,
      last24h: last24hRes.count ?? 0,
      failures24h: failures24hRes.count ?? 0,
      latestRequestedAt: latest?.requested_at ?? null,
      latestSuccess: latest?.success ?? null,
      windowDays: safeDays,
    },
  };
}

export async function deleteAiWriteLogsOlderThan(days = AI_WRITE_LOG_RETENTION_DAYS) {
  const safeDays = Math.max(days, 1);
  const cutoffIso = getCutoffIso(safeDays);
  const admin = getSupabaseAdmin();

  const countRes = await admin
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .lt("requested_at", cutoffIso);

  if (countRes.error) throw countRes.error;

  const deleteCount = countRes.count ?? 0;
  if (deleteCount > 0) {
    const deleteRes = await admin
      .from(TABLE)
      .delete()
      .lt("requested_at", cutoffIso);
    if (deleteRes.error) throw deleteRes.error;
  }

  return {
    deletedCount: deleteCount,
    cutoffIso,
    retentionDays: safeDays,
  };
}

export async function maybePruneAiWriteLogs() {
  const now = Date.now();
  if (now - lastPruneAttemptAt < 12 * 60 * 60 * 1000) {
    return null;
  }

  lastPruneAttemptAt = now;
  return deleteAiWriteLogsOlderThan(AI_WRITE_LOG_RETENTION_DAYS);
}
