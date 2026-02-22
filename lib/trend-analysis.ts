// =============================================================
// 트렌드 분석 엔진
// analyzeTrend, analyzeContentGap, generateTopicSuggestions
// =============================================================

import type { BlogCategoryValue, BlogPostMeta } from "./blog/types";
import type { CategoryKeywords } from "./admin-naver-datalab-keywords";

export type TrendDirection = "rising" | "falling" | "stable";

export interface TrendResult {
  direction: TrendDirection;
  /** 전기 대비 변화율 (%), 소수점 1자리 */
  changeRate: number;
  /** 후반부 가중 평균 ratio (카테고리 내 비교용) */
  currentAvg: number;
}

export interface CategoryTrendData {
  category: BlogCategoryValue;
  slug: string;
  subGroups: Array<{
    name: string;
    trend: TrendDirection;
    changeRate: number;
    currentAvg: number;
    data: Array<{ period: string; ratio: number }>;
  }>;
}

export interface ContentGap {
  category: BlogCategoryValue;
  /** 영어 카테고리 슬러그 */
  slug: string;
  subGroup: string;
  keywords: string[];
  trend: TrendDirection;
  /** 변화율 (%) */
  changeRate: number;
  /** 후반부 평균 ratio (카테고리 내 검색량 지표) */
  currentAvg: number;
  /** title/subtitle/excerpt/tags 키워드 매칭된 포스트 수 */
  existingPostCount: number;
  /** 0~100, 높을수록 콘텐츠 필요 */
  gapScore: number;
  /** 월간 검색량 (검색광고 API 연동 시), null이면 미연동 */
  monthlyVolume: number | null;
  /** 데이터 출처 */
  volumeSource: "searchad" | "datalab-fallback";
  /** "< 10" 추정값 포함 여부 */
  isEstimated: boolean;
}

export interface TopicSuggestion {
  rank: number;
  category: BlogCategoryValue;
  /** 영어 카테고리 슬러그 */
  slug: string;
  /** topicAngle 템플릿 + 트렌드 키워드 조합으로 생성된 제목 */
  suggestedTitle: string;
  /** 추천 이유 (한국어) */
  reasoning: string;
  /** 관련 키워드 */
  keywords: string[];
  trend: TrendDirection;
  gapScore: number;
  priority: "high" | "medium" | "low";
}

// =============================================================
// 공통 헬퍼
// =============================================================

/** 3-point 이동평균 평활화 (스파이크 완화) */
function smooth(data: Array<{ ratio: number }>): number[] {
  if (data.length < 3) return data.map((d) => d.ratio);
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - 1);
    const end = Math.min(data.length, i + 2);
    const window = data.slice(start, end);
    result.push(window.reduce((s, d) => s + d.ratio, 0) / window.length);
  }
  return result;
}

/** 선형 가중 평균 (최근 데이터에 높은 가중치) */
function weightedAvg(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  let weightSum = 0;
  let valueSum = 0;
  for (let i = 0; i < n; i++) {
    const w = i + 1;
    valueSum += values[i] * w;
    weightSum += w;
  }
  return valueSum / weightSum;
}

/**
 * 콘텐츠 부족도 — 지수 감소 함수
 * 0개=100, 1개=67, 2개=45, 3개=30, 4개=20, 5개=14, 10개=2
 * 선형(100-n*25)의 4개 cliff 제거
 */
export function calcContentLack(postCount: number): number {
  return Math.round(100 * Math.exp(-postCount / 2.5));
}

// =============================================================
// analyzeTrend — 트렌드 방향 판별
// =============================================================

/**
 * 시계열 데이터를 전반부/후반부로 분할하여 트렌드 방향과 변화율을 계산한다.
 *
 * v2 개선:
 * - 3-point 이동평균 평활화 → 일시적 스파이크 완화
 * - 선형 가중 평균 → 최근 데이터에 더 높은 가중치
 * - firstAvg=0 엣지케이스: changeRate = min(100, secondAvg × 10) (비례적)
 * - 임계값: changeRate > 10 → "rising", < -10 → "falling", 그 외 → "stable"
 */
export function analyzeTrend(data: Array<{ period: string; ratio: number }>): TrendResult {
  if (data.length === 0) {
    return { direction: "stable", changeRate: 0, currentAvg: 0 };
  }

  // 이동평균 평활화 적용
  const smoothed = smooth(data);

  const mid = Math.floor(smoothed.length / 2);
  const firstHalf = smoothed.slice(0, mid);
  const secondHalf = smoothed.slice(mid);

  // 가중 평균 (최근 데이터 높은 가중치)
  const firstAvg = weightedAvg(firstHalf);
  const secondAvg = weightedAvg(secondHalf);

  const currentAvg = Math.round(secondAvg * 10) / 10;

  // 전반부 평균이 0인 엣지 케이스: 비례적 changeRate
  if (firstAvg === 0) {
    if (secondAvg > 0) {
      const changeRate = Math.min(100, Math.round(secondAvg * 10 * 10) / 10);
      return { direction: "rising", changeRate, currentAvg };
    }
    return { direction: "stable", changeRate: 0, currentAvg };
  }

  const changeRate = Math.round(((secondAvg - firstAvg) / firstAvg) * 100 * 10) / 10;

  let direction: TrendDirection;
  if (changeRate > 10) {
    direction = "rising";
  } else if (changeRate < -10) {
    direction = "falling";
  } else {
    direction = "stable";
  }

  return { direction, changeRate, currentAvg };
}

// =============================================================
// analyzeContentGap — 콘텐츠 갭 분석
// =============================================================

/** volumeData의 값 타입 */
export interface VolumeDataEntry {
  monthlyTotalQcCnt: number;
  isEstimated: boolean;
}

/**
 * 트렌드 데이터와 발행된 블로그 포스트를 교차 분석하여 콘텐츠 갭을 식별한다.
 *
 * v2 gapScore 공식:
 *
 * 정규 공식 (검색광고 연동 시):
 *   volumeScore = min(100, log10(monthlyTotal + 1) × 25)
 *   trendBonus = clamp(-10, 20, changeRate > 0 ? changeRate × 0.4 : changeRate × 0.2)
 *   contentLack = round(100 × exp(-existingPostCount / 2.5))
 *   gapScore = clamp(0, 100, volumeScore × 0.6 + trendBonus × 0.1 + contentLack × 0.4)
 *
 * 폴백 공식 (검색광고 미연동):
 *   volumeScore = normalizedTrendScore (카테고리 내 정규화)
 *   나머지 동일
 *
 * 키워드-포스트 매칭:
 * - title + subtitle + excerpt + tags (v2 추가) 기반
 * - 동일 카테고리 포스트만 대상
 */
export function analyzeContentGap(
  categoryData: CategoryTrendData[],
  publishedPosts: BlogPostMeta[],
  categoryKeywords?: CategoryKeywords[],
  volumeData?: Record<string, VolumeDataEntry>,
): ContentGap[] {
  const gaps: ContentGap[] = [];
  const hasVolumeData = volumeData && Object.keys(volumeData).length > 0;

  for (const catData of categoryData) {
    // 동일 카테고리 포스트만 필터링
    const categoryPosts = publishedPosts.filter((p) => p.category === catData.category);

    // 이 카테고리의 원본 키워드 정의 조회 (있는 경우)
    const catKw = categoryKeywords?.find((ck) => ck.category === catData.category);

    // 카테고리 내 서브그룹별 중간 결과 수집
    const catGaps: Array<{
      subGroup: string;
      keywords: string[];
      trend: TrendDirection;
      changeRate: number;
      currentAvg: number;
      existingPostCount: number;
      rawTrendScore: number;
      monthlyVolume: number | null;
      isEstimated: boolean;
    }> = [];

    for (const sg of catData.subGroups) {
      // 원본 키워드 배열 조회
      const subGroupDef = catKw?.subGroups.find((s) => s.name === sg.name);
      const keywords = subGroupDef?.keywords ?? [];

      // B-4: 키워드-포스트 매칭 (tags 포함)
      const existingPostCount = categoryPosts.filter((post) => {
        const text = `${post.title} ${post.subtitle} ${post.excerpt} ${(post.tags ?? []).join(" ")}`;
        if (keywords.length > 0) {
          return keywords.some((kw) => text.includes(kw));
        }
        // 키워드 정의 없을 경우 서브그룹명으로 단순 매칭
        return text.includes(sg.name);
      }).length;

      // rawTrendScore: 폴백용 (카테고리 내 정규화에 사용)
      const changeComponent = Math.min(100, Math.max(0, 50 + sg.changeRate));
      const rawTrendScore = sg.currentAvg * 0.7 + changeComponent * 0.3;

      // 검색광고 검색량 조회 (key = "카테고리:서브그룹")
      const volumeKey = `${catData.category}:${sg.name}`;
      const vol = volumeData?.[volumeKey];

      catGaps.push({
        subGroup: sg.name,
        keywords,
        trend: sg.trend,
        changeRate: sg.changeRate,
        currentAvg: sg.currentAvg,
        existingPostCount,
        rawTrendScore,
        monthlyVolume: vol?.monthlyTotalQcCnt ?? null,
        isEstimated: vol?.isEstimated ?? false,
      });
    }

    // 카테고리 내 정규화 (폴백용: 최고 서브그룹 = 100)
    const maxRaw = Math.max(...catGaps.map((g) => g.rawTrendScore), 1);

    for (const g of catGaps) {
      // gapScore v2 공식
      let volumeScore: number;
      if (hasVolumeData && g.monthlyVolume != null) {
        // 정규 공식: 로그 스케일 검색량
        volumeScore = Math.min(100, Math.log10(g.monthlyVolume + 1) * 25);
      } else {
        // 폴백: 카테고리 내 정규화된 트렌드 점수
        volumeScore = (g.rawTrendScore / maxRaw) * 100;
      }

      // trendBonus: 상승 최대 +20, 하락 최대 -10
      const rawTrendBonus =
        g.changeRate > 0 ? g.changeRate * 0.4 : g.changeRate * 0.2;
      const trendBonus = Math.min(20, Math.max(-10, rawTrendBonus));

      const contentLack = calcContentLack(g.existingPostCount);

      // 최종 점수: clamp [0, 100]
      const rawScore = volumeScore * 0.6 + trendBonus * 0.1 + contentLack * 0.4;
      const gapScore = Math.round(Math.min(100, Math.max(0, rawScore)));

      gaps.push({
        category: catData.category,
        slug: catData.slug,
        subGroup: g.subGroup,
        keywords: g.keywords,
        trend: g.trend,
        changeRate: g.changeRate,
        currentAvg: g.currentAvg,
        existingPostCount: g.existingPostCount,
        gapScore,
        monthlyVolume: g.monthlyVolume,
        volumeSource: hasVolumeData && g.monthlyVolume != null ? "searchad" : "datalab-fallback",
        isEstimated: g.isEstimated,
      });
    }
  }

  // gapScore 내림차순 정렬
  return gaps.sort((a, b) => b.gapScore - a.gapScore);
}

// =============================================================
// generateTopicSuggestions — 블로그 주제 추천
// =============================================================

/**
 * 콘텐츠 갭과 TopicAngle 템플릿을 결합하여 구체적인 블로그 주제를 추천한다.
 *
 * v2 개선: 검색광고 연동 시 월간 검색량 표시, 미연동 시 상대 검색량 표시
 */
export function generateTopicSuggestions(
  gaps: ContentGap[],
  categoryKeywords: CategoryKeywords[],
): TopicSuggestion[] {
  const currentYear = new Date().getFullYear().toString();
  const suggestions: TopicSuggestion[] = [];

  for (const gap of gaps) {
    // 카테고리에 해당하는 CategoryKeywords 조회
    const catKw = categoryKeywords.find((ck) => ck.category === gap.category);
    if (!catKw) continue;

    // 서브그룹에 매칭되는 TopicAngle 조회
    const angle = catKw.topicAngles.find((ta) => ta.subGroup === gap.subGroup);
    if (!angle) continue;

    // 키워드: gap에 이미 있으면 사용, 없으면 CategoryKeywords에서 조회
    const subGroupDef = catKw.subGroups.find((sg) => sg.name === gap.subGroup);
    const keywords = gap.keywords.length > 0 ? gap.keywords : (subGroupDef?.keywords ?? []);
    const firstKeyword = keywords[0] ?? gap.subGroup;

    // 템플릿 변수 치환
    const suggestedTitle = angle.template
      .replace(/\{keyword\}/g, firstKeyword)
      .replace(/\{year\}/g, currentYear)
      .replace(/\{aspect\}/g, angle.aspect)
      .replace(/\{count\}/g, "5");

    // 추천 이유 생성 (한국어) — v2: 검색량 출처에 따라 다른 표현
    const trendLabel =
      gap.trend === "rising" ? "상승" : gap.trend === "falling" ? "하락" : "보합";

    let volumePart: string;
    if (gap.monthlyVolume != null) {
      // 검색광고 연동: 월간 절대 검색량
      const volumeStr = gap.isEstimated
        ? `≈${gap.monthlyVolume.toLocaleString("ko-KR")}`
        : gap.monthlyVolume.toLocaleString("ko-KR");
      volumePart = `월 ${volumeStr}회 검색`;
    } else {
      // 미연동: 상대 검색량 수준
      const volumeLabel = gap.currentAvg >= 60 ? "높은" : gap.currentAvg >= 30 ? "중간" : "낮은";
      volumePart = `${volumeLabel} 검색량(${gap.currentAvg.toFixed(0)})`;
    }

    const reasoning =
      gap.existingPostCount === 0
        ? `'${gap.subGroup}' ${volumePart} · 트렌드 ${trendLabel}(${gap.changeRate > 0 ? "+" : ""}${gap.changeRate}%) · 관련 포스트 없음`
        : `'${gap.subGroup}' ${volumePart} · 트렌드 ${trendLabel}(${gap.changeRate > 0 ? "+" : ""}${gap.changeRate}%) · 포스트 ${gap.existingPostCount}개`;

    const priority: TopicSuggestion["priority"] =
      gap.gapScore >= 70 ? "high" : gap.gapScore >= 40 ? "medium" : "low";

    suggestions.push({
      rank: 0, // 정렬 후 채움
      category: gap.category,
      slug: gap.slug,
      suggestedTitle,
      reasoning,
      keywords,
      trend: gap.trend,
      gapScore: gap.gapScore,
      priority,
    });
  }

  // gapScore 내림차순 정렬 후 rank 부여, 상위 15개만 반환
  return suggestions
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 15)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
