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
type Point = Values & { start: string; end: string };

export type CruxData = {
  latest: Point | null;
  history: Point[];
  latestError: string | null;
  historyError: string | null;
};

const ORIGIN = new URL(BASE_URL).origin;
const HISTORY_PERIOD_COUNT = 40;
const INVALID_RESPONSE = "CrUX 응답 형식이 올바르지 않습니다.";

class CruxError extends Error {}

function readObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CruxError(INVALID_RESPONSE);
  }
  return value as Record<string, unknown>;
}

function formatDate(value: unknown) {
  const { year, month, day } = readObject(value);
  if (![year, month, day].every(Number.isInteger)) throw new CruxError(INVALID_RESPONSE);
  const text = [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  const date = new Date(text);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new CruxError(INVALID_RESPONSE);
  }
  return text;
}

function parseValue(value: unknown, metric: Metric) {
  if (value == null) return null;
  const numeric = metric === "cls" && typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)
    ? Number(value)
    : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric) || numeric < 0) {
    throw new CruxError(INVALID_RESPONSE);
  }
  return numeric;
}

function parseRecord(raw: unknown, history: boolean): Point[] {
  const record = readObject(readObject(raw).record);
  const key = readObject(record.key);
  if (key.origin !== ORIGIN || key.url !== undefined || key.formFactor !== undefined) {
    throw new CruxError(INVALID_RESPONSE);
  }
  const periods = history ? record.collectionPeriods : [record.collectionPeriod];
  if (!Array.isArray(periods) || periods.length === 0 || periods.length > HISTORY_PERIOD_COUNT) {
    throw new CruxError(INVALID_RESPONSE);
  }
  const metrics = readObject(record.metrics);
  const readSeries = (metric: Metric): (number | null)[] => {
    const value = metrics[METRICS[metric]];
    if (value === undefined) return [];
    const data = readObject(value);
    if (!history) return [parseValue(readObject(data.percentiles).p75, metric)];
    const { p75s } = readObject(data.percentilesTimeseries);
    if (!Array.isArray(p75s) || p75s.length !== periods.length) throw new CruxError(INVALID_RESPONSE);
    return p75s.map(point => parseValue(point, metric));
  };
  const lcp = readSeries("lcp");
  const inp = readSeries("inp");
  const cls = readSeries("cls");
  let previousEnd = "";
  return periods.map((value, index) => {
    const period = readObject(value);
    const start = formatDate(period.firstDate);
    const end = formatDate(period.lastDate);
    if (start > end || end <= previousEnd) throw new CruxError(INVALID_RESPONSE);
    previousEnd = end;
    return { start, end, lcp: lcp[index] ?? null, inp: inp[index] ?? null, cls: cls[index] ?? null };
  });
}

function errorMessage(reason: unknown) {
  return reason instanceof CruxError ? reason.message : "CrUX 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
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
      origin: ORIGIN,
      metrics: Object.values(METRICS),
      ...(history && { collectionPeriodCount: HISTORY_PERIOD_COUNT }),
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
    redirect: "error",
  });
  if (response.status === 404) return [];
  if ([400, 401, 403].includes(response.status)) {
    throw new CruxError("CrUX API 인증 또는 설정을 확인해 주세요.");
  }
  if (response.status === 429) {
    throw new CruxError("CrUX 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) throw new Error("CrUX request failed");
  const raw: unknown = await response.json().catch(() => { throw new CruxError(INVALID_RESPONSE); });
  return parseRecord(raw, history);
}

const getLatest = unstable_cache(() => queryCrux(false), ["crux-latest-v2", ORIGIN], { revalidate: 6 * 60 * 60 });
const getHistory = unstable_cache(() => queryCrux(true), ["crux-history-v2", ORIGIN], { revalidate: 24 * 60 * 60 });
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!process.env.CRUX_API_KEY?.trim()) {
    return Response.json({ message: "CrUX API 키가 설정되지 않았습니다." }, { status: 503, headers });
  }

  const [latest, history] = await Promise.allSettled([getLatest(), getHistory()]);
  const latestError = latest.status === "rejected" ? errorMessage(latest.reason) : null;
  const historyError = history.status === "rejected" ? errorMessage(history.reason) : null;
  if (latest.status === "rejected" && history.status === "rejected") {
    const message = latestError === historyError ? latestError : `최신 집계 · ${latestError} 주간 추세 · ${historyError}`;
    return Response.json({ message }, { status: 502, headers });
  }

  return Response.json({
    latest: latest.status === "fulfilled" ? latest.value[0] ?? null : null,
    history: history.status === "fulfilled" ? history.value : [],
    latestError,
    historyError,
  } satisfies CruxData, { headers });
}
