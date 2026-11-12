import { after, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getTodayKST } from "@/lib/date";

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TARGET_URL = "https://www.born2smile.co.kr";
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];

// Lazy getter — 환경변수 초기화 타이밍 보장
function getApiKey(): string | undefined {
  return process.env.PAGESPEED_API_KEY?.trim() || undefined;
}

interface PSICategory {
  id: string;
  title: string;
  score: number | null;
}

interface CWVMetric {
  id: string;
  label: string;
  percentile: number | null;
  unit: string;
  category: string;
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
  coreWebVitals: CWVMetric[];
  overallCategory: string;
  audits: PSIAudit[];
}

const CWV_METRICS = [
  { id: "LARGEST_CONTENTFUL_PAINT_MS", label: "LCP", unit: "ms" },
  { id: "INTERACTION_TO_NEXT_PAINT", label: "INP", unit: "ms" },
  { id: "CUMULATIVE_LAYOUT_SHIFT", label: "CLS", unit: "" },
  { id: "FIRST_CONTENTFUL_PAINT_MS", label: "FCP", unit: "ms" },
  { id: "EXPERIMENTAL_TIME_TO_FIRST_BYTE", label: "TTFB", unit: "ms" },
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
function parsePSIResponse(
  json: any,
  strategy: "mobile" | "desktop",
): PSIResult {
  const lighthouse = json.lighthouseResult;
  const loading = json.loadingExperience;

  const categories: PSICategory[] = CATEGORIES.map((catId) => {
    const cat = lighthouse?.categories?.[catId];
    return {
      id: catId,
      title: cat?.title ?? catId,
      score: cat?.score != null ? Math.round(cat.score * 100) : null,
    };
  });

  const coreWebVitals: CWVMetric[] = CWV_METRICS.map((metric) => {
    const data = loading?.metrics?.[metric.id];
    return {
      id: metric.id,
      label: metric.label,
      percentile: data?.percentile ?? null,
      unit: metric.unit,
      category: data?.category ?? "NONE",
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
    url: TARGET_URL,
    categories,
    coreWebVitals,
    overallCategory: loading?.overall_category ?? "NONE",
    audits,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchPSI(
  strategy: "mobile" | "desktop",
): Promise<PSIResult | null> {
  try {
    const params = new URLSearchParams({ url: TARGET_URL, strategy });
    CATEGORIES.forEach((c) => params.append("category", c));
    const apiKey = getApiKey();
    if (apiKey) params.set("key", apiKey);

    const res = await fetch(`${PSI_API}?${params}`, { cache: "no-store" });

    if (!res.ok) {
      console.error(
        `PSI API error (${strategy}):`,
        res.status,
        await res.text(),
      );
      return null;
    }

    const json = await res.json();
    return parsePSIResponse(json, strategy);
  } catch (e) {
    console.error(`PSI fetch error (${strategy}):`, e);
    return null;
  }
}

interface SinglePSIResponse {
  result: PSIResult;
  stale?: boolean;
}

type PSIStrategy = "mobile" | "desktop";

interface PSICacheRow {
  key: string;
  data: unknown;
}

function getStrategyCacheKey(date: string, strategy: PSIStrategy) {
  return `psi-homepage-${date}-${strategy}`;
}

async function saveStrategyCache(
  strategy: PSIStrategy,
  date: string,
  result: PSIResult,
) {
  const { error } = await getSupabaseAdmin()
    .from("api_cache")
    .upsert({
      key: getStrategyCacheKey(date, strategy),
      data: result,
      fetched_at: new Date().toISOString(),
    });
  if (error) throw error;
}

/**
 * 선택한 측정 환경의 일별 캐시 조회 및 이전 결과 폴백
 * unstable_cache 미사용 — stale 응답이 L1에 캐싱되는 문제 방지
 */
async function fetchSingleStrategyPSI(
  strategy: PSIStrategy,
  force: boolean,
): Promise<SinglePSIResponse> {
  try {
    const admin = getSupabaseAdmin();
    const today = getTodayKST();

    if (!force) {
      // 선택한 환경의 최신 캐시만 조회한다. 통합 캐시는 사용하지 않는다.
      const { data: rows, error } = await admin
        .from("api_cache")
        .select("key, data")
        .like("key", `psi-homepage-%-${strategy}`)
        .order("key", { ascending: false })
        .limit(1);
      if (error) throw error;

      const row = (rows as PSICacheRow[] | null)?.[0];
      const cached = row?.data as PSIResult | null | undefined;
      if (cached?.strategy === strategy) {
        if (row?.key === getStrategyCacheKey(today, strategy)) return { result: cached };
        after(async () => {
          try {
            const fresh = await fetchPSI(strategy);
            if (fresh) await saveStrategyCache(strategy, today, fresh);
          } catch (error) {
            console.error(`PSI background refresh error (${strategy}):`, error);
          }
        });
        return { result: cached, stale: true };
      }
    }

    // 캐시 없음 또는 force → PSI API 직접 호출
    const fresh = await fetchPSI(strategy);
    if (!fresh) throw new Error("PSI_FETCH_FAILED");

    try {
      await saveStrategyCache(strategy, today, fresh);
    } catch (error) {
      console.error(`PSI cache write error (${strategy}):`, error);
    }

    return { result: fresh };
  } catch (e) {
    if (e instanceof Error && e.message === "PSI_FETCH_FAILED") throw e;

    // Supabase 접근 실패 → PSI API 직접 호출
    const fresh = await fetchPSI(strategy);
    if (!fresh) throw new Error("PSI_FETCH_FAILED");
    return { result: fresh };
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

  try {
    const response = await fetchSingleStrategyPSI(strategy, force);
    return NextResponse.json(
      { data: response },
      { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } },
    );
  } catch (error) {
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
