import { NextResponse } from "next/server";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "@/app/api/admin/_lib/cache";

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TARGET_URL = "https://www.born2smile.co.kr";
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];

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

interface PSIAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue?: string;
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
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      score: a.score != null ? Math.round(a.score * 100) : null,
      displayValue: a.displayValue,
    }));

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

const getCachedPSI = createCachedFetcher<PSIResponseData>(
  "psi-homepage",
  async () => {
    const [mobile, desktop] = await Promise.all([
      fetchPSI("mobile"),
      fetchPSI("desktop"),
    ]);
    return { mobile, desktop };
  },
  CACHE_TTL.PSI,
);

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const data = await getCachedPSI();

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    },
  );
}
