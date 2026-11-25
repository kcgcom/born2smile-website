import { setTimeout as delay } from "node:timers/promises";
import { after, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getTodayKST } from "@/lib/date";
import { BASE_URL } from "@/lib/constants";
import { PAGESPEED_TARGETS, type PageSpeedTarget } from "@/lib/pagespeed-targets";
import { PERFORMANCE_AUDIT_PARAM } from "@/lib/performance-audit";

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];
const MEASUREMENT_TIMEOUT_MS = 75_000;
const WAIT_TIMEOUT_MS = 90_000;
const DB_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 2_000;

export const maxDuration = 120;

// Lazy getter — 환경변수 초기화 타이밍 보장
function getApiKey(): string | undefined {
  return process.env.PAGESPEED_API_KEY?.trim() || undefined;
}

interface PSICategory {
  id: string;
  title: string;
  score: number | null;
}

interface PSIAuditItem {
  url: string;
  wastedMs?: number;
  wastedBytes?: number;
  totalBytes?: number;
}

interface PSIAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue?: string;
  description?: string;
  savingsMs?: number;
  savingsBytes?: number;
  items?: PSIAuditItem[];
}

interface PSIResult {
  strategy: "mobile" | "desktop";
  fetchedAt: string;
  url: string;
  categories: PSICategory[];
  audits: PSIAudit[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parsePSIResponse(
  json: any,
  { strategy, url }: MeasurementTarget,
): PSIResult {
  const lighthouse = json.lighthouseResult;

  const categories: PSICategory[] = CATEGORIES.map((catId) => {
    const cat = lighthouse?.categories?.[catId];
    return {
      id: catId,
      title: cat?.title ?? catId,
      score: cat?.score != null ? Math.round(cat.score * 100) : null,
    };
  });

  const audits: PSIAudit[] = Object.values(lighthouse?.audits ?? {})
    .filter(
      (a: any) =>
        a.scoreDisplayMode === "numeric" && a.score != null && a.score < 1,
    )
    .sort((a: any, b: any) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 10)
    .map((a: any) => {
      // description에서 Lighthouse 마크다운 링크 제거 (예: [Learn more](https://...))
      const desc = (a.description as string | undefined)
        ?.replace(/\s*\[.*?\]\(https?:\/\/[^)]+\)\.?/g, "")
        .trim();

      // details.items에서 리소스별 절감 정보 추출 (최대 5개)
      const rawItems: any[] = a.details?.items ?? [];
      const items: PSIAuditItem[] = rawItems
        .filter((it: any) => it.url)
        .slice(0, 5)
        .map((it: any) => ({
          url: it.url,
          ...(it.wastedMs != null && { wastedMs: Math.round(it.wastedMs) }),
          ...(it.wastedBytes != null && { wastedBytes: it.wastedBytes }),
          ...(it.totalBytes != null && { totalBytes: it.totalBytes }),
        }));

      return {
        id: a.id,
        title: a.title,
        score: a.score != null ? Math.round(a.score * 100) : null,
        displayValue: a.displayValue,
        ...(desc && { description: desc }),
        ...(a.details?.overallSavingsMs != null && {
          savingsMs: Math.round(a.details.overallSavingsMs),
        }),
        ...(a.details?.overallSavingsBytes != null && {
          savingsBytes: a.details.overallSavingsBytes,
        }),
        ...(items.length > 0 && { items }),
      };
    });

  return {
    strategy,
    fetchedAt: new Date().toISOString(),
    url,
    categories,
    audits,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchPSI(
  target: MeasurementTarget,
  trigger: "background" | "manual" | "cache-miss",
  runId: string,
  cachedFetchedAt?: string,
): Promise<PSIResult | null> {
  const { strategy, url, runKey } = target;
  const startedAt = Date.now();
  let measured = false;
  console.info("PSI measurement started", { strategy, runKey, trigger, runId, cachedFetchedAt, startedAt });
  try {
    const auditUrl = new URL(url);
    auditUrl.searchParams.set(PERFORMANCE_AUDIT_PARAM, "1");
    const params = new URLSearchParams({ url: auditUrl.href, strategy, fields: "lighthouseResult" });
    CATEGORIES.forEach((c) => params.append("category", c));
    const apiKey = getApiKey();
    if (apiKey) params.set("key", apiKey);

    const res = await fetch(`${PSI_API}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(MEASUREMENT_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`PSI API error (${strategy}):`, res.status);
      return null;
    }

    const json = await res.json();
    const result = parsePSIResponse(json, target);
    measured = true;
    return result;
  } catch (e) {
    console.error(`PSI fetch error (${strategy}):`, e instanceof Error ? e.name : "UnknownError");
    return null;
  } finally {
    console.info("PSI measurement", {
      strategy,
      runKey,
      trigger,
      runId,
      cachedFetchedAt,
      startedAt,
      durationMs: Date.now() - startedAt,
      measured,
    });
  }
}

interface SinglePSIResponse {
  result: PSIResult | null;
  stale?: boolean;
}

type PSIStrategy = "mobile" | "desktop";

function measurementTarget(page: PageSpeedTarget, strategy: PSIStrategy) {
  const isHome = page.id === "home";
  const runKey = isHome ? strategy : `${page.id}-${strategy}`;
  return {
    strategy, runKey, isHome,
    url: `${BASE_URL}${page.path}`,
    cacheKey: isHome ? `psi-homepage-latest-${strategy}` : `psi-latest-${runKey}`,
  };
}

type MeasurementTarget = ReturnType<typeof measurementTarget>;

type MeasurementClaim =
  | { status: "claimed" | "running"; runId: string; startedAt: string }
  | { status: "fresh" | "cooldown" };

function readCachedResult(data: unknown, target: MeasurementTarget): PSIResult | undefined {
  const result = data as PSIResult | undefined;
  if (result?.strategy !== target.strategy) return undefined;
  if (!target.isHome && result.url !== target.url) return undefined;
  const { strategy, fetchedAt, url, categories, audits } = result;
  return { strategy, fetchedAt, url, categories, audits };
}

async function readLatestResult(target: MeasurementTarget) {
  const { data, error } = await getSupabaseAdmin()
    .from("api_cache")
    .select("data")
    .eq("key", target.cacheKey)
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
    .maybeSingle();
  if (error) throw error;
  return readCachedResult(data?.data, target);
}

async function claimMeasurement(runKey: string, manual: boolean) {
  const { data, error } = await getSupabaseAdmin()
    .rpc("claim_pagespeed_measurement", { p_strategy: runKey, p_manual: manual })
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw error;
  return data as MeasurementClaim;
}

async function measureAndSave(
  target: MeasurementTarget,
  trigger: "background" | "manual" | "cache-miss",
  runId: string,
  cachedFetchedAt?: string,
) {
  const result = await fetchPSI(target, trigger, runId, cachedFetchedAt);
  const { data: finished, error } = await getSupabaseAdmin()
    .rpc("finish_pagespeed_measurement", {
      p_strategy: target.runKey,
      p_run_id: runId,
      p_result: result,
    })
    .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
  if (error) throw error;
  if (!finished || !result) throw new Error("PSI_FETCH_FAILED");
  return result;
}

async function waitForMeasurement(
  target: MeasurementTarget,
  runId: string,
  startedAt: string,
  requestSignal: AbortSignal,
) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(WAIT_TIMEOUT_MS)]);

  while (Date.now() < deadline) {
    const { data: run, error } = await getSupabaseAdmin()
      .from("pagespeed_measurement_runs")
      .select("run_id, expires_at, retry_at, last_success_at")
      .eq("strategy", target.runKey)
      .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(DB_TIMEOUT_MS)]))
      .maybeSingle();
    if (error) throw error;

    const joinedRunFinished = run?.run_id === runId && !run.expires_at && !run.retry_at;
    const newerResultExists = run?.last_success_at && Date.parse(run.last_success_at) > Date.parse(startedAt);
    if (joinedRunFinished || newerResultExists) {
      const result = await readLatestResult(target);
      if (result) return result;
      throw new Error("PSI_FETCH_FAILED");
    }

    if (run?.run_id !== runId || !run.expires_at || Date.parse(run.expires_at) <= Date.now()) {
      throw new Error("PSI_FETCH_FAILED");
    }

    await delay(Math.min(POLL_INTERVAL_MS, deadline - Date.now()), undefined, { signal });
  }

  throw new Error("PSI_WAIT_TIMEOUT");
}

async function fetchSingleStrategyPSI(
  target: MeasurementTarget,
  force: boolean,
  requestSignal: AbortSignal,
): Promise<SinglePSIResponse> {
  const { strategy, isHome, runKey } = target;
  if (!force) {
    let cached = await readLatestResult(target);
    if (!isHome) return { result: cached ?? null };
    let cachedDate = cached && getTodayKST(new Date(cached.fetchedAt));
    if (!cached) {
      // 데이터 정리 마이그레이션 전에도 기존 날짜별 결과를 표시한다.
      const { data: rows, error } = await getSupabaseAdmin()
        .from("api_cache")
        .select("key, data")
        .like("key", `psi-homepage-____-__-__-${strategy}`)
        .order("key", { ascending: false })
        .limit(1)
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
      if (error) throw error;
      cached = readCachedResult(rows?.[0]?.data, target);
      cachedDate = rows?.[0]?.key.slice("psi-homepage-".length, "psi-homepage-".length + 10);
    }

    if (cached?.strategy === strategy) {
      if (cachedDate === getTodayKST()) return { result: cached };
      const cachedFetchedAt = cached.fetchedAt;
      after(async () => {
        try {
          const claim = await claimMeasurement(runKey, false);
          if (claim.status === "claimed") {
            await measureAndSave(target, "background", claim.runId, cachedFetchedAt);
          }
        } catch (error) {
          console.error(`PSI background refresh error (${strategy}):`, error);
        }
      });
      return { result: cached, stale: true };
    }
  }

  const claim = await claimMeasurement(runKey, force);
  switch (claim.status) {
    case "claimed":
      return { result: await measureAndSave(target, force ? "manual" : "cache-miss", claim.runId) };
    case "running":
      return { result: await waitForMeasurement(target, claim.runId, claim.startedAt, requestSignal) };
    case "fresh": {
      const result = await readLatestResult(target);
      if (result) return { result };
      throw new Error("PSI_FETCH_FAILED");
    }
    case "cooldown":
      throw new Error("PSI_COOLDOWN");
  }
}

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const strategy = searchParams.get("strategy");
  if (strategy !== "mobile" && strategy !== "desktop") {
    return NextResponse.json(
      { error: "INVALID_STRATEGY", message: "측정 환경을 mobile 또는 desktop으로 지정해 주세요." },
      { status: 400, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } },
    );
  }
  const pageId = searchParams.get("target") ?? "home";
  const page = PAGESPEED_TARGETS.find(target => target.id === pageId);
  if (!page) {
    return NextResponse.json(
      { error: "INVALID_TARGET", message: "지원하는 측정 페이지를 선택해 주세요." },
      { status: 400, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } },
    );
  }

  try {
    const response = await fetchSingleStrategyPSI(measurementTarget(page, strategy), force, request.signal);
    return NextResponse.json(
      { data: response },
      { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PSI_COOLDOWN") {
      return NextResponse.json(
        { error: "PSI_COOLDOWN", message: "자동 분석을 잠시 쉬고 있습니다. 새로 분석을 눌러 다시 시도할 수 있습니다." },
        { status: 503, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } },
      );
    }
    Sentry.captureException(error);
    const hasKey = !!getApiKey();
    const message = hasKey
      ? "PageSpeed API 호출에 실패했습니다. 잠시 후 다시 시도해주세요."
      : "PageSpeed API 키가 설정되지 않았습니다. PAGESPEED_API_KEY 환경변수를 확인해주세요.";

    return NextResponse.json(
      { error: "PSI_ERROR", message },
      {
        status: 502,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
