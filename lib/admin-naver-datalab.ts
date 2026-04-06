// Naver DataLab Search Trend API client
// https://openapi.naver.com/v1/datalab/search

import type { KeywordSubGroup } from "./admin-naver-datalab-keywords";

interface DatalabRequestFilter {
  device?: "pc" | "mo";
  gender?: "m" | "f";
  ages?: string[];
}

const KEYWORD_GROUPS = [
  { groupName: "임플란트", keywords: ["임플란트", "임플란트 비용", "임플란트 수명", "임플란트 통증"] },
  { groupName: "치아교정", keywords: ["치아교정", "투명교정", "교정 비용", "치아교정 기간"] },
  { groupName: "보철·보존", keywords: ["크라운", "충치치료", "신경치료", "레진", "인레이"] },
  { groupName: "소아치과", keywords: ["소아치과", "어린이 치과", "유치 충치", "아이 치과"] },
  { groupName: "예방·건강", keywords: ["스케일링", "치석제거", "잇몸질환", "치주염", "구강건강"] },
];

export interface NaverDatalabData {
  period: { start: string; end: string };
  timeUnit: string;
  groups: Array<{
    title: string;
    data: Array<{
      period: string;
      ratio: number;
    }>;
  }>;
}

/**
 * 기간 문자열로부터 DataLab API 요청에 필요한 startDate, endDate, timeUnit을 계산한다.
 *
 * @param period - "7d" | "28d" | "90d" (SearchTab 호환) | "1m" | "3m" | "1y" | "3y" | "10y" (StrategySubTab)
 */
function getPeriodDates(period: string) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);

  const PERIOD_MAP: Record<string, { days: number; timeUnit: string }> = {
    "7d":  { days: 7,    timeUnit: "date" },
    "28d": { days: 28,   timeUnit: "date" },
    "90d": { days: 90,   timeUnit: "week" },
    "1m":  { days: 30,   timeUnit: "date" },
    "3m":  { days: 90,   timeUnit: "date" },
    "1y":  { days: 365,  timeUnit: "week" },
    "3y":  { days: 1095, timeUnit: "month" },
    "10y": { days: 3650, timeUnit: "month" },
  };

  const config = PERIOD_MAP[period] ?? { days: 90, timeUnit: "week" };

  const endDate = new Date(kstNow);
  endDate.setDate(endDate.getDate() - 1); // DataLab data available up to yesterday
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - config.days + 1);

  // DataLab 데이터는 2016-01-01부터 존재 — startDate 클램핑
  const minDate = new Date("2016-01-01T00:00:00Z");
  if (startDate < minDate) {
    startDate.setTime(minDate.getTime());
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(startDate), endDate: fmt(endDate), timeUnit: config.timeUnit };
}

export async function fetchNaverDatalabTrend(period: string): Promise<NaverDatalabData> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_DATALAB_CLIENT_ID/SECRET 환경변수가 설정되지 않았습니다");
  }

  const { startDate, endDate, timeUnit } = getPeriodDates(period);

  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify({
      startDate,
      endDate,
      timeUnit,
      keywordGroups: KEYWORD_GROUPS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`네이버 DataLab API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json();

  return {
    period: { start: startDate, end: endDate },
    timeUnit,
    groups: (json.results ?? []).map((r: { title: string; data: Array<{ period: string; ratio: number }> }) => ({
      title: r.title,
      data: (r.data ?? []).map((d: { period: string; ratio: number }) => ({
        period: d.period,
        ratio: Math.round(d.ratio * 10) / 10,
      })),
    })),
  };
}

// ---------------------------------------------------------------
// Internal helpers for bridged batching (>5 sub-groups)
// ---------------------------------------------------------------

interface ParsedGroup {
  title: string;
  data: Array<{ period: string; ratio: number }>;
}

/** 데이터 포인트 ratio의 평균을 계산한다. */
function avgRatio(data: Array<{ ratio: number }>): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.ratio, 0) / data.length;
}

/**
 * N개 서브그룹을 5개씩 분할하되, 인접 배치에 브릿지 그룹 1개를 공유한다.
 * 예: 6개 → [[0,1,2,3,4], [4,5]]  (인덱스 4가 브릿지)
 */
function splitIntoBridgedBatches(subGroups: KeywordSubGroup[]): KeywordSubGroup[][] {
  const batches: KeywordSubGroup[][] = [];
  const step = 4; // 배치당 신규 4개 + 브릿지 1개
  for (let i = 0; i < subGroups.length; i += step) {
    const end = Math.min(i + 5, subGroups.length);
    batches.push(subGroups.slice(i, end));
    if (end >= subGroups.length) break;
  }
  return batches;
}

/** 단일 배치에 대해 네이버 DataLab API를 호출한다. */
async function fetchSingleBatch(
  subGroups: KeywordSubGroup[],
  startDate: string,
  endDate: string,
  timeUnit: string,
  clientId: string,
  clientSecret: string,
  filter?: DatalabRequestFilter,
): Promise<ParsedGroup[]> {
  const keywordGroups = subGroups.map((sg) => ({
    groupName: sg.name,
    keywords: sg.keywords,
  }));

  const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify({
      startDate,
      endDate,
      timeUnit,
      keywordGroups,
      ...(filter?.device ? { device: filter.device } : {}),
      ...(filter?.gender ? { gender: filter.gender } : {}),
      ...(filter?.ages?.length ? { ages: filter.ages } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`네이버 DataLab API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return (json.results ?? []).map((r: { title: string; data: Array<{ period: string; ratio: number }> }) => ({
    title: r.title,
    data: (r.data ?? []).map((d: { period: string; ratio: number }) => ({
      period: d.period,
      ratio: d.ratio,
    })),
  }));
}

/**
 * 브릿지 그룹의 평균 비율로 스케일 팩터를 계산하고,
 * 배치2+ 결과를 배치1 기준으로 정규화한다.
 */
function normalizeBridgedBatches(
  batches: KeywordSubGroup[][],
  batchResults: ParsedGroup[][],
): ParsedGroup[] {
  if (batchResults.length === 0) return [];
  if (batchResults.length === 1) return batchResults[0];

  const merged: ParsedGroup[] = [...batchResults[0]];
  const seen = new Set(merged.map((g) => g.title));

  for (let i = 1; i < batchResults.length; i++) {
    // 브릿지 = 이전 배치의 마지막 그룹명
    const bridgeName = batches[i - 1][batches[i - 1].length - 1].name;

    // 브릿지 그룹을 양쪽 배치에서 찾는다
    const bridgeInPrev = merged.find((g) => g.title === bridgeName);
    const bridgeInCurr = batchResults[i].find((g) => g.title === bridgeName);

    let scale = 1.0;
    if (bridgeInPrev && bridgeInCurr) {
      const avgPrev = avgRatio(bridgeInPrev.data);
      const avgCurr = avgRatio(bridgeInCurr.data);
      scale = avgCurr > 0 ? avgPrev / avgCurr : 1.0;
    }

    for (const group of batchResults[i]) {
      if (seen.has(group.title)) continue;
      seen.add(group.title);
      merged.push({
        title: group.title,
        data: group.data.map((d) => ({
          period: d.period,
          ratio: d.ratio * scale,
        })),
      });
    }
  }

  return merged;
}

/**
 * 주어진 서브그룹 배열로 네이버 DataLab API를 호출한다.
 * 5개 이하면 단일 호출, 6개 이상이면 브릿지 배칭으로 자동 분할/정규화한다.
 *
 * @param subGroups - KeywordSubGroup[] (최대 15개, 브릿지 배칭 지원)
 * @param period - "7d" | "28d" | "90d" | "1m" | "3m" | "1y" | "3y" | "10y"
 * @returns NaverDatalabData
 * @throws Error - 환경변수 미설정 또는 API 오류
 */
export async function fetchNaverDatalabByCategory(
  subGroups: KeywordSubGroup[],
  period: string,
  filter?: DatalabRequestFilter,
): Promise<NaverDatalabData> {
  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_DATALAB_CLIENT_ID/SECRET 환경변수가 설정되지 않았습니다");
  }

  const { startDate, endDate, timeUnit } = getPeriodDates(period);

  let groups: ParsedGroup[];

  if (subGroups.length <= 5) {
    // 단일 배치 — 기존 로직
    groups = await fetchSingleBatch(subGroups, startDate, endDate, timeUnit, clientId, clientSecret, filter);
  } else {
    // 브릿지 배칭 — 5개씩 분할, 브릿지 그룹으로 정규화
    const batches = splitIntoBridgedBatches(subGroups);
    const batchResults: ParsedGroup[][] = [];
    for (const batch of batches) {
      batchResults.push(await fetchSingleBatch(batch, startDate, endDate, timeUnit, clientId, clientSecret, filter));
    }
    groups = normalizeBridgedBatches(batches, batchResults);
  }

  return {
    period: { start: startDate, end: endDate },
    timeUnit,
    groups: groups.map((g) => ({
      title: g.title,
      data: g.data.map((d) => ({
        period: d.period,
        ratio: Math.round(Math.min(100, d.ratio) * 10) / 10,
      })),
    })),
  };
}
