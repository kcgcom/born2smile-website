// =============================================================
// 네이버 검색광고 API 클라이언트 (keywordstool)
// 절대 검색량(월간 PC+모바일) 조회
// =============================================================

import crypto from "crypto";

// ── 환경변수 (lazy — Cloud Run 시크릿 주입 타이밍 보장) ─────

const BASE_URL = "https://api.searchad.naver.com";
const URI = "/keywordstool";

function getApiKey(): string {
  return (process.env.NAVER_SEARCHAD_API_KEY ?? "").trim();
}
function getSecretKey(): string {
  return (process.env.NAVER_SEARCHAD_SECRET_KEY ?? "").trim();
}
function getCustomerId(): string {
  return (process.env.NAVER_SEARCHAD_CUSTOMER_ID ?? "").trim();
}

// ── Types ────────────────────────────────────────────────────

export interface SearchAdKeywordData {
  keyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyTotalQcCnt: number;
  isEstimated: boolean;
  compIdx: string;
  /** true = API가 반환한 연관 키워드, false = 요청한 키워드 */
  isRelated: boolean;
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
  return !!(getApiKey() && getSecretKey() && getCustomerId());
}

/** 키워드 정규화: 공백 제거 + 소문자 (API는 공백 없는 형태로 반환) */
function normalizeKeyword(kw: string): string {
  return kw.replace(/\s+/g, "").toLowerCase();
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
function generateSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

/** 인증 헤더 생성 */
function getAuthHeaders(): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, "GET", URI, getSecretKey());
  return {
    "X-API-KEY": getApiKey(),
    "X-Customer": getCustomerId(),
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
  // API는 공백 없는 키워드만 허용 (예: "임플란트비용", NOT "임플란트 비용")
  const hintKeywords = keywords.slice(0, 5).map((k) => k.replace(/\s+/g, "")).join(",");
  const url = `${BASE_URL}${URI}?hintKeywords=${encodeURIComponent(hintKeywords)}&showDetail=1`;

  const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Naver SearchAd API error: ${res.status} ${res.statusText} | ${body}`);
  }

  const json = await res.json();
  const items: unknown[] = json.keywordList ?? [];

  // 요청 키워드 세트 (isRelated 플래그 판별용)
  const requestedSet = new Set(keywords.map(normalizeKeyword));

  return items
    .filter((item: unknown) => {
      const kw = (item as Record<string, unknown>).relKeyword;
      return typeof kw === "string";
    })
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      const pc = safeParseCount(row.monthlyPcQcCnt);
      const mobile = safeParseCount(row.monthlyMobileQcCnt);
      const keyword = String(row.relKeyword);
      return {
        keyword,
        monthlyPcQcCnt: pc.count,
        monthlyMobileQcCnt: mobile.count,
        monthlyTotalQcCnt: pc.count + mobile.count,
        isEstimated: pc.estimated || mobile.estimated,
        compIdx: String(row.compIdx ?? ""),
        isRelated: !requestedSet.has(normalizeKeyword(keyword)),
      };
    });
}

/** 지정된 ms만큼 대기 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 키워드 목록의 검색량을 조회한다.
 * 5개씩 묶어서 순차 호출 (API 레이트 리밋 방지, 배치 간 200ms 대기).
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

  const allData: SearchAdKeywordData[] = [];
  const errors: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(200);
    try {
      const result = await fetchKeywordBatch(batches[i]);
      allData.push(...result);
    } catch (err) {
      // 429 레이트 리밋 → 2초 대기 후 1회 재시도
      if (err instanceof Error && (err.message.includes("429") || err.message.includes("401"))) {
        await sleep(2000);
        try {
          const retry = await fetchKeywordBatch(batches[i]);
          allData.push(...retry);
          continue;
        } catch {
          // 재시도도 실패 → 에러 기록 후 계속
        }
      }
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // 전체 실패 시 첫 번째 에러를 throw하여 호출자가 감지할 수 있게 함
  if (allData.length === 0 && errors.length > 0) {
    throw new Error(`SearchAd API 전체 실패: ${errors[0]}`);
  }

  return allData;
}
