// =============================================================
// 네이버 검색광고 API 클라이언트 (keywordstool)
// 절대 검색량(월간 PC+모바일) 조회
// =============================================================

import crypto from "crypto";

// ── 환경변수 ──────────────────────────────────────────────────

const API_KEY = process.env.NAVER_SEARCHAD_API_KEY ?? "";
const SECRET_KEY = process.env.NAVER_SEARCHAD_SECRET_KEY ?? "";
const CUSTOMER_ID = process.env.NAVER_SEARCHAD_CUSTOMER_ID ?? "";

const BASE_URL = "https://api.naver.com";
const URI = "/keywordstool";

// ── Types ────────────────────────────────────────────────────

export interface SearchAdKeywordData {
  keyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyTotalQcCnt: number;
  isEstimated: boolean;
  compIdx: string;
}

export interface SubGroupVolume {
  monthlyTotalQcCnt: number;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  isEstimated: boolean;
  volumeSource: "searchad";
  keywords: SearchAdKeywordData[];
}

// ── Helpers ──────────────────────────────────────────────────

/** 환경변수 설정 여부 확인 */
export function isSearchAdConfigured(): boolean {
  return !!(API_KEY && SECRET_KEY && CUSTOMER_ID);
}

/** "< 10" 등 비정형 값을 안전하게 숫자로 파싱 */
export function safeParseCount(value: unknown): { count: number; estimated: boolean } {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return { count: value, estimated: false };
  }
  if (typeof value === "string") {
    if (value.includes("<")) return { count: 5, estimated: true };
    const n = Number(value);
    return { count: Number.isNaN(n) ? 0 : n, estimated: false };
  }
  return { count: 0, estimated: false };
}

/** HMAC-SHA256 서명 생성 */
function generateSignature(timestamp: string, method: string, uri: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("base64");
}

/** 인증 헤더 생성 */
function getAuthHeaders(): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, "GET", URI);
  return {
    "X-API-KEY": API_KEY,
    "X-Customer": CUSTOMER_ID,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}

// ── API 호출 ─────────────────────────────────────────────────

/**
 * 키워드 검색량 조회 (최대 5개 키워드)
 * @param keywords 조회할 키워드 배열 (최대 5개)
 * @returns 키워드별 검색량 데이터 또는 null (미설정/오류)
 */
async function fetchKeywordBatch(keywords: string[]): Promise<SearchAdKeywordData[]> {
  const hintKeywords = keywords.slice(0, 5).join(",");
  const url = `${BASE_URL}${URI}?hintKeywords=${encodeURIComponent(hintKeywords)}&showDetail=1`;

  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    throw new Error(`Naver SearchAd API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const items: unknown[] = json.keywordList ?? [];

  // 요청 키워드만 필터링 (연관 키워드 제외)
  const requestedSet = new Set(keywords.map((k) => k.toLowerCase().trim()));

  return items
    .filter((item: unknown) => {
      const kw = (item as Record<string, unknown>).relKeyword;
      return typeof kw === "string" && requestedSet.has(kw.toLowerCase().trim());
    })
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      const pc = safeParseCount(row.monthlyPcQcCnt);
      const mobile = safeParseCount(row.monthlyMobileQcCnt);
      return {
        keyword: String(row.relKeyword),
        monthlyPcQcCnt: pc.count,
        monthlyMobileQcCnt: mobile.count,
        monthlyTotalQcCnt: pc.count + mobile.count,
        isEstimated: pc.estimated || mobile.estimated,
        compIdx: String(row.compIdx ?? ""),
      };
    });
}

/**
 * 키워드 목록의 검색량을 조회한다.
 * 5개씩 묶어서 병렬 호출하며, 타임스탬프 스큐 시 1회 재시도.
 *
 * @param keywords 전체 키워드 배열 (5개 초과 시 자동 분할)
 * @returns 키워드별 검색량 배열 또는 null (미설정)
 */
export async function fetchKeywordSearchVolume(
  keywords: string[],
): Promise<SearchAdKeywordData[] | null> {
  if (!isSearchAdConfigured()) return null;
  if (keywords.length === 0) return [];

  // 5개씩 배치 분할
  const batches: string[][] = [];
  for (let i = 0; i < keywords.length; i += 5) {
    batches.push(keywords.slice(i, i + 5));
  }

  const results = await Promise.allSettled(
    batches.map(async (batch) => {
      try {
        return await fetchKeywordBatch(batch);
      } catch (err) {
        // 타임스탬프 스큐 가능성 → 5초 후 1회 재시도
        if (err instanceof Error && err.message.includes("401")) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return await fetchKeywordBatch(batch);
        }
        throw err;
      }
    }),
  );

  const allData: SearchAdKeywordData[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allData.push(...result.value);
    }
    // 부분 실패는 무시 (성공한 것만 반환)
  }

  return allData;
}
