import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher } from "../../_lib/cache";
import { isSearchAdConfigured, fetchKeywordSearchVolume } from "@/lib/admin-naver-searchad";
import type { SearchAdKeywordData } from "@/lib/admin-naver-searchad";
import { CATEGORY_KEYWORDS } from "@/lib/admin-naver-datalab-keywords";

/** 24시간 캐시 (월간 검색량은 자주 변하지 않음) */
const CACHE_TTL_24H = 86400;

interface SubGroupVolumeResult {
  monthlyTotalQcCnt: number;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  isEstimated: boolean;
  volumeSource: "searchad";
  keywords: SearchAdKeywordData[];
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  // Graceful degradation: 검색광고 API 미설정 시 null 반환
  if (!isSearchAdConfigured()) {
    return Response.json(
      { data: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const getData = createCachedFetcher(
      "searchad-volume-endpoint",
      async () => {
        // 모든 카테고리의 volumeKeywords 수집
        const allKeywords: Array<{ category: string; subGroup: string; keywords: string[] }> = [];
        for (const ck of CATEGORY_KEYWORDS) {
          for (const sg of ck.subGroups) {
            allKeywords.push({
              category: ck.category,
              subGroup: sg.name,
              keywords: sg.volumeKeywords,
            });
          }
        }

        // 전체 키워드 플랫 배열
        const flatKeywords = allKeywords.flatMap((item) => item.keywords);
        const uniqueKeywords = [...new Set(flatKeywords)];

        // 검색량 조회
        const volumeResults = await fetchKeywordSearchVolume(uniqueKeywords);
        if (!volumeResults) return null;

        // 키워드 → 검색량 맵
        const keywordMap = new Map<string, SearchAdKeywordData>();
        for (const item of volumeResults) {
          keywordMap.set(item.keyword.toLowerCase().trim(), item);
        }

        // 서브그룹별 검색량 집계
        const subGroups: Record<string, SubGroupVolumeResult> = {};
        let successCount = 0;
        const totalCount = allKeywords.length;

        for (const group of allKeywords) {
          const key = `${group.category}:${group.subGroup}`;
          const matchedKeywords: SearchAdKeywordData[] = [];
          let totalPc = 0;
          let totalMobile = 0;
          let anyEstimated = false;

          for (const kw of group.keywords) {
            const data = keywordMap.get(kw.toLowerCase().trim());
            if (data) {
              matchedKeywords.push(data);
              totalPc += data.monthlyPcQcCnt;
              totalMobile += data.monthlyMobileQcCnt;
              if (data.isEstimated) anyEstimated = true;
            }
          }

          if (matchedKeywords.length > 0) {
            successCount++;
            subGroups[key] = {
              monthlyTotalQcCnt: totalPc + totalMobile,
              monthlyPcQcCnt: totalPc,
              monthlyMobileQcCnt: totalMobile,
              isEstimated: anyEstimated,
              volumeSource: "searchad",
              keywords: matchedKeywords,
            };
          }
        }

        return {
          subGroups,
          fetchedAt: new Date().toISOString(),
          coverage: totalCount > 0 ? successCount / totalCount : 0,
        };
      },
      CACHE_TTL_24H,
    );

    const data = await getData();

    return Response.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "검색량 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
