import type { searchconsole_v1 } from "googleapis";
import { BASE_URL } from "./constants";
import { createSearchConsoleContext } from "./admin-search-console";
import { getSupabaseAdmin } from "./supabase-admin";

export const INDEXING_BATCH_SIZE = 50;
export const INDEXING_MAX_BATCH_SIZE = 200;
const INDEXING_FULL_CYCLE_DAYS = 30;
const INDEXING_CONCURRENCY = 5;
const TABLE = "gsc_index_status";
const EVENTS_TABLE = "gsc_index_events";
const RUNS_TABLE = "gsc_index_monitor_runs";

export type IndexMonitorStatus =
  | "unchecked"
  | "indexed"
  | "discovered"
  | "crawled-not-indexed"
  | "unknown"
  | "excluded"
  | "failed";

export interface IndexStatusItem {
  url: string;
  path: string;
  status: IndexMonitorStatus;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
  canonicalMismatch: boolean;
  pendingCount: number;
  inspectedAt: string | null;
  lastChangedAt: string | null;
  error: string | null;
}

interface IndexStatusRow {
  url: string;
  path: string;
  status: IndexMonitorStatus;
  verdict: string | null;
  coverage_state: string | null;
  robots_txt_state: string | null;
  indexing_state: string | null;
  page_fetch_state: string | null;
  last_crawl_time: string | null;
  user_canonical: string | null;
  google_canonical: string | null;
  canonical_mismatch: boolean;
  confirmed_signature: string | null;
  confirmed_status: IndexMonitorStatus | null;
  pending_signature: string | null;
  pending_count: number;
  inspected_at: string | null;
  last_changed_at: string | null;
  last_seen_in_sitemap_at: string;
  next_inspect_at: string;
  error_message: string | null;
}

interface IndexObservation {
  status: Exclude<IndexMonitorStatus, "unchecked" | "failed">;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
  canonicalMismatch: boolean;
  signature: string;
}

export interface IndexingMonitorData {
  summary: Record<IndexMonitorStatus, number> & {
    total: number;
    needsAttention: number;
    pendingChanges: number;
  };
  items: IndexStatusItem[];
  events: Array<{
    id: number;
    url: string;
    fromStatus: string | null;
    toStatus: string;
    observedAt: string;
  }>;
  lastRun: {
    status: string;
    processed: number;
    succeeded: number;
    failed: number;
    completedAt: string | null;
    error: string | null;
  } | null;
};

export type IndexMonitorRunStatus = "completed" | "completed_with_errors" | "failed";

export interface IndexMonitorRunResult {
  skipped: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  status: IndexMonitorRunStatus | "skipped";
  confirmedRegressions: number;
  confirmedCanonicalMismatches: number;
}

function normalizeCanonical(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function classifyIndexStatus(result: searchconsole_v1.Schema$IndexStatusInspectionResult): IndexObservation {
  const coverageState = result.coverageState ?? null;
  let status: IndexObservation["status"];
  if (result.verdict === "PASS") {
    status = "indexed";
  } else if (coverageState?.toLowerCase().includes("discovered")) {
    status = "discovered";
  } else if (coverageState?.toLowerCase().includes("crawled")) {
    status = "crawled-not-indexed";
  } else if (coverageState?.toLowerCase().includes("unknown")) {
    status = "unknown";
  } else {
    status = "excluded";
  }

  const userCanonical = result.userCanonical ?? null;
  const googleCanonical = result.googleCanonical ?? null;
  const canonicalMismatch = Boolean(
    userCanonical &&
    googleCanonical &&
    normalizeCanonical(userCanonical) !== normalizeCanonical(googleCanonical),
  );
  const signature = [
    status,
    result.verdict ?? "",
    coverageState ?? "",
    result.robotsTxtState ?? "",
    result.indexingState ?? "",
    result.pageFetchState ?? "",
    normalizeCanonical(userCanonical) ?? "",
    normalizeCanonical(googleCanonical) ?? "",
  ].join("|");

  return {
    status,
    verdict: result.verdict ?? null,
    coverageState,
    robotsTxtState: result.robotsTxtState ?? null,
    indexingState: result.indexingState ?? null,
    pageFetchState: result.pageFetchState ?? null,
    lastCrawlTime: result.lastCrawlTime ?? null,
    userCanonical,
    googleCanonical,
    canonicalMismatch,
    signature,
  };
}

export function selectInspectionBatch<T extends {
  url: string;
  inspectedAt: string | null;
  nextInspectionAt?: string | null;
  pendingCount?: number;
  error?: string | null;
}>(
  items: T[],
  limit = INDEXING_BATCH_SIZE,
  now = new Date().toISOString(),
): T[] {
  return items
    .filter((item) => item.nextInspectionAt == null || item.nextInspectionAt <= now)
    .sort((a, b) => {
      const aPriority = a.error ? 0 : (a.pendingCount ?? 0) > 0 ? 1 : a.inspectedAt == null ? 2 : 3;
      const bPriority = b.error ? 0 : (b.pendingCount ?? 0) > 0 ? 1 : b.inspectedAt == null ? 2 : 3;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const nextCompare = (a.nextInspectionAt ?? "").localeCompare(b.nextInspectionAt ?? "");
      if (nextCompare !== 0) return nextCompare;
      if (a.inspectedAt == null && b.inspectedAt != null) return -1;
      if (a.inspectedAt != null && b.inspectedAt == null) return 1;
      return (a.inspectedAt ?? "").localeCompare(b.inspectedAt ?? "") || a.url.localeCompare(b.url);
    })
    .slice(0, limit);
}

export function getDailyInspectionLimit(totalUrls: number): number {
  return Math.min(
    INDEXING_MAX_BATCH_SIZE,
    Math.max(INDEXING_BATCH_SIZE, Math.ceil(totalUrls / INDEXING_FULL_CYCLE_DAYS)),
  );
}

export function getInspectionErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; response?: { status?: unknown } };
  const rawStatus = candidate.response?.status ?? candidate.code;
  const status = typeof rawStatus === "string" ? Number.parseInt(rawStatus, 10) : rawStatus;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

export function getRunCompletionStatus(succeeded: number, failed: number): IndexMonitorRunStatus {
  if (failed === 0) return "completed";
  if (succeeded === 0) return "failed";
  return "completed_with_errors";
}

export function shouldAlertRunFailures(succeeded: number, failed: number): boolean {
  const total = succeeded + failed;
  return total > 0 && failed / total >= 0.5;
}

export function isValidCronAuthorization(
  cronSecret: string | undefined,
  authorization: string | null,
): boolean {
  return Boolean(cronSecret) && authorization === `Bearer ${cronSecret}`;
}

/**
 * 실패/변경 확인은 1일, 주의 상태는 7일, 안정적인 색인은 30일 뒤에 재검사한다.
 * 일일 검사량은 사이트맵 크기에 맞춰 조정해 30일 순환 주기를 목표로 한다.
 */
export function getNextInspectionAt(
  status: IndexMonitorStatus,
  options: { pendingChange?: boolean; canonicalMismatch?: boolean; failed?: boolean } = {},
  now = new Date(),
): string {
  const intervalDays = options.failed || options.pendingChange
    ? 1
    : status === "indexed" && !options.canonicalMismatch
      ? 30
      : 7;
  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
}

export function nextObservationState(
  confirmedSignature: string | null,
  pendingSignature: string | null,
  pendingCount: number,
  observedSignature: string,
): { confirmedSignature: string; pendingSignature: string | null; pendingCount: number; changed: boolean } {
  if (!confirmedSignature) {
    return { confirmedSignature: observedSignature, pendingSignature: null, pendingCount: 0, changed: false };
  }
  if (observedSignature === confirmedSignature) {
    return { confirmedSignature, pendingSignature: null, pendingCount: 0, changed: false };
  }
  if (observedSignature === pendingSignature && pendingCount >= 1) {
    return { confirmedSignature: observedSignature, pendingSignature: null, pendingCount: 0, changed: true };
  }
  return { confirmedSignature, pendingSignature: observedSignature, pendingCount: 1, changed: false };
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

async function fetchSitemapUrls(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/sitemap.xml`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sitemap 조회 실패 (HTTP ${response.status})`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function mapStatusRow(row: IndexStatusRow): IndexStatusItem {
  return {
    url: row.url,
    path: row.path,
    status: row.status,
    verdict: row.verdict,
    coverageState: row.coverage_state,
    robotsTxtState: row.robots_txt_state,
    indexingState: row.indexing_state,
    pageFetchState: row.page_fetch_state,
    lastCrawlTime: row.last_crawl_time,
    userCanonical: row.user_canonical,
    googleCanonical: row.google_canonical,
    canonicalMismatch: row.canonical_mismatch,
    pendingCount: row.pending_count,
    inspectedAt: row.inspected_at,
    lastChangedAt: row.last_changed_at,
    error: row.error_message,
  };
}

async function persistObservation(row: IndexStatusRow, observation: IndexObservation, inspectedAt: string) {
  const admin = getSupabaseAdmin();
  const transition = nextObservationState(
    row.confirmed_signature,
    row.pending_signature,
    row.pending_count,
    observation.signature,
  );
  const previousStatus = row.confirmed_status;
  const confirmedStatus = !row.confirmed_signature || transition.changed
    ? observation.status
    : row.confirmed_status;
  const { error } = await admin.from(TABLE).update({
    status: observation.status,
    verdict: observation.verdict,
    coverage_state: observation.coverageState,
    robots_txt_state: observation.robotsTxtState,
    indexing_state: observation.indexingState,
    page_fetch_state: observation.pageFetchState,
    last_crawl_time: observation.lastCrawlTime,
    user_canonical: observation.userCanonical,
    google_canonical: observation.googleCanonical,
    canonical_mismatch: observation.canonicalMismatch,
    confirmed_signature: transition.confirmedSignature,
    confirmed_status: confirmedStatus,
    pending_signature: transition.pendingSignature,
    pending_count: transition.pendingCount,
    inspected_at: inspectedAt,
    last_changed_at: transition.changed ? inspectedAt : row.last_changed_at,
    next_inspect_at: getNextInspectionAt(observation.status, {
      pendingChange: transition.pendingCount > 0,
      canonicalMismatch: observation.canonicalMismatch,
    }, new Date(inspectedAt)),
    error_message: null,
  }).eq("url", row.url);
  if (error) throw error;

  if (transition.changed && previousStatus !== observation.status) {
    const { error: eventError } = await admin.from(EVENTS_TABLE).insert({
      url: row.url,
      from_status: previousStatus,
      to_status: observation.status,
      observed_at: inspectedAt,
    });
    if (eventError) {
      console.error(`[indexing-monitor] 상태 변경 이력 저장 실패: ${eventError.message}`);
    }
  }

  return {
    confirmedRegression: transition.changed
      && previousStatus === "indexed"
      && observation.status !== "indexed",
    confirmedCanonicalMismatch: transition.changed && observation.canonicalMismatch,
  };
}

async function persistInspectionFailure(url: string, inspectedAt: string, error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  const { error: updateError } = await getSupabaseAdmin().from(TABLE).update({
    inspected_at: inspectedAt,
    next_inspect_at: getNextInspectionAt("failed", { failed: true }, new Date(inspectedAt)),
    error_message: message.slice(0, 500),
  }).eq("url", url);
  if (updateError) throw updateError;
}

async function createMonitorRun(batchSize: number): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { error: staleRunError } = await admin.from(RUNS_TABLE).update({
    status: "failed",
    error_message: "작업 제한 시간을 초과했습니다.",
    completed_at: new Date().toISOString(),
  }).eq("status", "running").lt("started_at", staleBefore);
  if (staleRunError) throw staleRunError;

  const { data, error } = await admin.from(RUNS_TABLE).insert({ batch_size: batchSize }).select("id").maybeSingle();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data?.id ?? null;
}

export async function runIndexingMonitor(requestedBatchSize?: number): Promise<IndexMonitorRunResult> {
  const runId = await createMonitorRun(requestedBatchSize ?? INDEXING_BATCH_SIZE);
  if (!runId) {
    return {
      skipped: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: "skipped",
      confirmedRegressions: 0,
      confirmedCanonicalMismatches: 0,
    };
  }
  const admin = getSupabaseAdmin();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let confirmedRegressions = 0;
  let confirmedCanonicalMismatches = 0;

  try {
    const sitemapUrls = await fetchSitemapUrls();
    const batchSize = requestedBatchSize ?? getDailyInspectionLimit(sitemapUrls.length);
    const { error: batchSizeError } = await admin.from(RUNS_TABLE).update({
      batch_size: batchSize,
    }).eq("id", runId);
    if (batchSizeError) throw batchSizeError;

    const seenAt = new Date().toISOString();
    const placeholders = sitemapUrls.map((url) => ({
      url,
      path: pathFromUrl(url),
      last_seen_in_sitemap_at: seenAt,
    }));
    const { error: upsertError } = await admin.from(TABLE).upsert(placeholders, { onConflict: "url" });
    if (upsertError) throw upsertError;

    const { data: rows, error: rowsError } = await admin.from(TABLE)
      .select("*")
      .eq("last_seen_in_sitemap_at", seenAt);
    if (rowsError) throw rowsError;

    const batch = selectInspectionBatch(
      ((rows ?? []) as IndexStatusRow[]).map((row) => ({
        ...row,
        inspectedAt: row.inspected_at,
        pendingCount: row.pending_count,
        nextInspectionAt: row.next_inspect_at,
        error: row.error_message,
      })),
      batchSize,
    );
    const rowByUrl = new Map(((rows ?? []) as IndexStatusRow[]).map((row) => [row.url, row]));
    const { searchconsole, siteUrl } = await createSearchConsoleContext();
    let cursor = 0;
    let fatalError: unknown = null;

    async function inspectUrl(url: string) {
      const retryDelays = [500, 1_500];
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await searchconsole.urlInspection.index.inspect({
            requestBody: { inspectionUrl: url, siteUrl, languageCode: "en-US" },
          });
        } catch (error) {
          const status = getInspectionErrorStatus(error);
          if (status == null || status < 500 || attempt >= retryDelays.length) throw error;
          await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        }
      }
    }

    async function worker() {
      while (cursor < batch.length) {
        if (fatalError) return;
        const item = batch[cursor++];
        const inspectedAt = new Date().toISOString();
        try {
          const response = await inspectUrl(item.url);
          const result = response.data.inspectionResult?.indexStatusResult;
          if (!result) throw new Error("URL 검사 결과가 없습니다.");
          const observation = await persistObservation(
            rowByUrl.get(item.url)!,
            classifyIndexStatus(result),
            inspectedAt,
          );
          succeeded += 1;
          if (observation.confirmedRegression) confirmedRegressions += 1;
          if (observation.confirmedCanonicalMismatch) confirmedCanonicalMismatches += 1;
        } catch (error) {
          failed += 1;
          await persistInspectionFailure(item.url, inspectedAt, error);
          const status = getInspectionErrorStatus(error);
          if (status === 401 || status === 403 || status === 429) fatalError ??= error;
        } finally {
          processed += 1;
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(INDEXING_CONCURRENCY, batch.length) }, worker));
    if (fatalError) throw fatalError;

    const status = getRunCompletionStatus(succeeded, failed);
    if (status === "failed") {
      throw new Error(`URL 검사 ${failed}건이 모두 실패했습니다.`);
    }
    const { error: completeError } = await admin.from(RUNS_TABLE).update({
      status,
      processed_count: processed,
      success_count: succeeded,
      failure_count: failed,
      error_message: failed > 0 ? `${failed}개 URL 검사 실패` : null,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    if (completeError) throw completeError;
    return {
      skipped: false,
      processed,
      succeeded,
      failed,
      status,
      confirmedRegressions,
      confirmedCanonicalMismatches,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    await admin.from(RUNS_TABLE).update({
      status: "failed",
      processed_count: processed,
      success_count: succeeded,
      failure_count: failed,
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    throw error;
  }
}

export async function getIndexingMonitorData(): Promise<IndexingMonitorData> {
  const admin = getSupabaseAdmin();
  const [latestSeenResult, eventsResult, runResult] = await Promise.all([
    admin.from(TABLE).select("last_seen_in_sitemap_at").order("last_seen_in_sitemap_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from(EVENTS_TABLE).select("id,url,from_status,to_status,observed_at").order("observed_at", { ascending: false }).limit(200),
    admin.from(RUNS_TABLE).select("status,processed_count,success_count,failure_count,completed_at,error_message").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (latestSeenResult.error) throw latestSeenResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (runResult.error) throw runResult.error;

  let statusRows: IndexStatusRow[] = [];
  const latestSeenAt = latestSeenResult.data?.last_seen_in_sitemap_at;
  if (latestSeenAt) {
    const { data, error } = await admin.from(TABLE)
      .select("*")
      .eq("last_seen_in_sitemap_at", latestSeenAt)
      .order("path");
    if (error) throw error;
    statusRows = (data ?? []) as IndexStatusRow[];
  }

  const items = statusRows.map(mapStatusRow);
  const activeUrls = new Set(items.map((item) => item.url));
  const baseSummary = {
    unchecked: 0,
    indexed: 0,
    discovered: 0,
    "crawled-not-indexed": 0,
    unknown: 0,
    excluded: 0,
    failed: 0,
  } satisfies Record<IndexMonitorStatus, number>;
  for (const item of items) {
    baseSummary[item.error ? "failed" : item.status] += 1;
  }

  return {
    summary: {
      ...baseSummary,
      total: items.length,
      needsAttention: items.filter((item) =>
        item.error || item.canonicalMismatch || (item.status !== "indexed" && item.status !== "unchecked"),
      ).length,
      pendingChanges: items.filter((item) => item.pendingCount > 0).length,
    },
    items,
    events: (eventsResult.data ?? []).filter((row) => activeUrls.has(row.url)).slice(0, 50).map((row) => ({
      id: row.id,
      url: row.url,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      observedAt: row.observed_at,
    })),
    lastRun: runResult.data ? {
      status: runResult.data.status,
      processed: runResult.data.processed_count,
      succeeded: runResult.data.success_count,
      failed: runResult.data.failure_count,
      completedAt: runResult.data.completed_at,
      error: runResult.data.error_message,
    } : null,
  };
}
