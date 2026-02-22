// Naver DataLab Search Trend API client
// https://openapi.naver.com/v1/datalab/search

import type { KeywordSubGroup } from "./admin-naver-datalab-keywords";

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

function getPeriodDates(period: string) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);

  const days = period === "7d" ? 7 : period === "28d" ? 28 : 90;
  const timeUnit = period === "90d" ? "week" : "date";

  const endDate = new Date(kstNow);
  endDate.setDate(endDate.getDate() - 1); // DataLab data available up to yesterday
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(startDate), endDate: fmt(endDate), timeUnit };
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

/**
 * 주어진 서브그룹 배열로 네이버 DataLab API를 호출한다.
 * 기존 fetchNaverDatalabTrend()과 동일한 로직이나 KEYWORD_GROUPS 대신
 * 외부에서 전달받은 subGroups를 사용한다.
 *
 * @param subGroups - KeywordSubGroup[] (최대 5개, API 제약)
 * @param period - "7d" | "28d" | "90d"
 * @returns NaverDatalabData
 * @throws Error - 환경변수 미설정, subGroups > 5, 또는 API 오류
 */
export async function fetchNaverDatalabByCategory(
  subGroups: KeywordSubGroup[],
  period: string,
): Promise<NaverDatalabData> {
  if (subGroups.length > 5) {
    throw new Error("네이버 DataLab API는 요청당 최대 5개 키워드 그룹만 허용합니다");
  }

  const clientId = process.env.NAVER_DATALAB_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_DATALAB_CLIENT_ID/SECRET 환경변수가 설정되지 않았습니다");
  }

  const { startDate, endDate, timeUnit } = getPeriodDates(period);

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
