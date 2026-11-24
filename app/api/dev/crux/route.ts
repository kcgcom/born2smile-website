import { unstable_cache } from "next/cache";
import { unauthorizedResponse, verifyAdminRequest } from "@/app/api/admin/_lib/auth";
import { BASE_URL } from "@/lib/constants";

const METRICS = {
  lcp: "largest_contentful_paint",
  inp: "interaction_to_next_paint",
  cls: "cumulative_layout_shift",
} as const;

type Metric = keyof typeof METRICS;
type Values = Record<Metric, number | null>;
type CruxDate = { year: number; month: number; day: number };
type Period = { firstDate: CruxDate; lastDate: CruxDate };
type RecordData = {
  collectionPeriod?: Period;
  collectionPeriods?: Period[];
  metrics: Record<string, {
    percentiles?: { p75: number | string };
    percentilesTimeseries?: { p75s: (number | string | null)[] };
  }>;
};
type Point = Values & { start: string; end: string };

export type CruxData = {
  latest: Point | null;
  history: Point[];
  latestUnavailable: boolean;
  historyUnavailable: boolean;
};

function formatDate({ year, month, day }: CruxDate) {
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function parseValue(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPoint(record: RecordData, period: Period, index?: number): Point {
  const read = (metric: Metric) => {
    const data = record.metrics[METRICS[metric]];
    return parseValue(index === undefined ? data?.percentiles?.p75 : data?.percentilesTimeseries?.p75s[index]);
  };
  return { start: formatDate(period.firstDate), end: formatDate(period.lastDate), lcp: read("lcp"), inp: read("inp"), cls: read("cls") };
}

async function queryCrux(history: boolean) {
  const method = history ? "queryHistoryRecord" : "queryRecord";
  const response = await fetch(`https://chromeuxreport.googleapis.com/v1/records:${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.CRUX_API_KEY!.trim(),
    },
    body: JSON.stringify({
      origin: new URL(BASE_URL).origin,
      metrics: Object.values(METRICS),
      ...(history && { collectionPeriodCount: 40 }),
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("CrUX request failed");
  const { record } = await response.json() as { record: RecordData };
  if (history) return (record.collectionPeriods ?? []).map((period, index) => toPoint(record, period, index));
  return record.collectionPeriod ? [toPoint(record, record.collectionPeriod)] : [];
}

const getLatest = unstable_cache(() => queryCrux(false), ["crux-latest", BASE_URL], { revalidate: 6 * 60 * 60 });
const getHistory = unstable_cache(() => queryCrux(true), ["crux-history", BASE_URL], { revalidate: 24 * 60 * 60 });
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!process.env.CRUX_API_KEY?.trim()) {
    return Response.json({ message: "CrUX API 키가 설정되지 않았습니다." }, { status: 503, headers });
  }

  const [latest, history] = await Promise.allSettled([getLatest(), getHistory()]);
  if (latest.status === "rejected" && history.status === "rejected") {
    return Response.json({ message: "CrUX 데이터를 불러오지 못했습니다." }, { status: 502, headers });
  }

  return Response.json({
    latest: latest.status === "fulfilled" ? latest.value[0] ?? null : null,
    history: history.status === "fulfilled" ? history.value : [],
    latestUnavailable: latest.status === "rejected",
    historyUnavailable: history.status === "rejected",
  } satisfies CruxData, { headers });
}
