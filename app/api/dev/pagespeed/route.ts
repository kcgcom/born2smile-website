import { NextResponse } from "next/server";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "@/app/api/admin/_lib/cache";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getTodayKST } from "@/lib/date";

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TARGET_URL = "https://www.born2smile.co.kr";
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];

// Lazy getter — Cloud Run 시크릿 주입 타이밍 이슈 대응
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

interface PSIResponseData {
  mobile: PSIResult | null;
  desktop: PSIResult | null;
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

/**
 * Firestore L2 캐시 + PSI API 호출
 * 일별 캐시 문서(`psi-homepage-YYYY-MM-DD`)로 저장.
 * force=true 시 캐시 무시하고 재호출.
 */
async function fetchPSIWithFirestoreCache(
  force: boolean,
): Promise<PSIResponseData> {
  try {
    const db = getFirestore(getAdminApp());
    const today = getTodayKST();
    const docId = `psi-homepage-${today}`;
    const docRef = db.collection("api-cache").doc(docId);

    // force가 아니면 Firestore 캐시 확인
    if (!force) {
      const cached = await docRef.get();
      if (cached.exists) {
        const cachedData = cached.data();
        if (cachedData?.mobile || cachedData?.desktop) {
          return {
            mobile: cachedData.mobile ?? null,
            desktop: cachedData.desktop ?? null,
          };
        }
      }
    }

    // 캐시 미스 또는 force → PSI API 호출
    const [mobile, desktop] = await Promise.all([
      fetchPSI("mobile"),
      fetchPSI("desktop"),
    ]);

    if (!mobile && !desktop) {
      throw new Error("PSI_BOTH_FAILED");
    }

    const result: PSIResponseData = { mobile, desktop };

    // Firestore에 저장 (비동기, 실패해도 무시)
    docRef
      .set({
        mobile,
        desktop,
        fetchedAt: Timestamp.now(),
      })
      .catch(() => {
        /* Firestore 쓰기 실패 무시 */
      });

    return result;
  } catch (e) {
    // Firestore 접근 실패 → PSI API 직접 호출로 폴백
    if (e instanceof Error && e.message === "PSI_BOTH_FAILED") throw e;

    const [mobile, desktop] = await Promise.all([
      fetchPSI("mobile"),
      fetchPSI("desktop"),
    ]);
    if (!mobile && !desktop) throw new Error("PSI_BOTH_FAILED");
    return { mobile, desktop };
  }
}

const getCachedPSI = createCachedFetcher<PSIResponseData>(
  "psi-homepage",
  () => fetchPSIWithFirestoreCache(false),
  CACHE_TTL.PSI,
);

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    // force=true: unstable_cache 우회, Firestore 캐시도 무시하고 PSI API 재호출
    const data = force
      ? await fetchPSIWithFirestoreCache(true)
      : await getCachedPSI();

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      },
    );
  } catch {
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
