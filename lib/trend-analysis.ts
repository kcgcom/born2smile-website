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
  /** 후반부 평균 ratio (카테고리 내 비교용) */
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
  /** title/subtitle/excerpt 키워드 매칭된 포스트 수 */
  existingPostCount: number;
  /** 0~100, 높을수록 콘텐츠 필요 */
  gapScore: number;
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
// analyzeTrend — 트렌드 방향 판별
// =============================================================

/**
 * 시계열 데이터를 전반부/후반부로 분할하여 트렌드 방향과 변화율을 계산한다.
 *
 * - 데이터를 50:50으로 분할하여 각 구간의 평균 ratio 비교
 * - changeRate = (후반부 평균 - 전반부 평균) / 전반부 평균 × 100
 * - 전반부 평균이 0인 경우: 후반부 > 0이면 "rising"(100%), 아니면 "stable"(0%)
 * - 임계값: changeRate > 10 → "rising", < -10 → "falling", 그 외 → "stable"
 */
export function analyzeTrend(data: Array<{ period: string; ratio: number }>): TrendResult {
  if (data.length === 0) {
    return { direction: "stable", changeRate: 0, currentAvg: 0 };
  }

  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid);
  const secondHalf = data.slice(mid);

  const avg = (arr: Array<{ period: string; ratio: number }>) =>
    arr.length === 0 ? 0 : arr.reduce((sum, d) => sum + d.ratio, 0) / arr.length;

  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);

  const currentAvg = Math.round(secondAvg * 10) / 10;

  // 전반부 평균이 0인 엣지 케이스 처리
  if (firstAvg === 0) {
    if (secondAvg > 0) {
      return { direction: "rising", changeRate: 100, currentAvg };
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

/**
 * 트렌드 데이터와 발행된 블로그 포스트를 교차 분석하여 콘텐츠 갭을 식별한다.
 *
 * 키워드-포스트 매칭:
 * - 동일 카테고리의 포스트만 대상 (카테고리 필터 적용)
 * - categoryKeywords가 제공된 경우: 서브그룹의 키워드 중 하나라도
 *   포스트의 title+subtitle+excerpt에 포함되면 매칭
 * - categoryKeywords가 없는 경우: 서브그룹명으로 단순 매칭
 *
 * gapScore 공식 (카테고리 간 비교 가능하도록 변화율 기반):
 * - trendScore = min(100, max(0, 50 + changeRate))
 * - contentLack = max(0, 100 - existingPostCount × 25)
 * - gapScore = trendScore × 0.6 + contentLack × 0.4
 */
export function analyzeContentGap(
  categoryData: CategoryTrendData[],
  publishedPosts: BlogPostMeta[],
  categoryKeywords?: CategoryKeywords[],
): ContentGap[] {
  const gaps: ContentGap[] = [];

  for (const catData of categoryData) {
    // 동일 카테고리 포스트만 필터링
    const categoryPosts = publishedPosts.filter((p) => p.category === catData.category);

    // 이 카테고리의 원본 키워드 정의 조회 (있는 경우)
    const catKw = categoryKeywords?.find((ck) => ck.category === catData.category);

    for (const sg of catData.subGroups) {
      // 원본 키워드 배열 조회
      const subGroupDef = catKw?.subGroups.find((s) => s.name === sg.name);
      const keywords = subGroupDef?.keywords ?? [];

      // 키워드-포스트 매칭: 서브그룹 키워드 중 하나라도 포스트 텍스트에 포함되면 카운트
      const existingPostCount = categoryPosts.filter((post) => {
        const text = `${post.title} ${post.subtitle} ${post.excerpt}`;
        if (keywords.length > 0) {
          return keywords.some((kw) => text.includes(kw));
        }
        // 키워드 정의 없을 경우 서브그룹명으로 단순 매칭
        return text.includes(sg.name);
      }).length;

      // gapScore 계산 (changeRate 기반 — 카테고리 간 비교 가능)
      const trendScore = Math.min(100, Math.max(0, 50 + sg.changeRate));
      const contentLack = Math.max(0, 100 - existingPostCount * 25);
      const gapScore = Math.round(trendScore * 0.6 + contentLack * 0.4);

      gaps.push({
        category: catData.category,
        slug: catData.slug,
        subGroup: sg.name,
        keywords,
        trend: sg.trend,
        changeRate: sg.changeRate,
        existingPostCount,
        gapScore,
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
 * 제목 생성 로직:
 * 1. ContentGap의 subGroup에 매칭되는 TopicAngle 조회
 * 2. 템플릿 변수 치환:
 *    - {keyword} → 서브그룹의 첫 번째 키워드
 *    - {year} → 현재 연도
 *    - {aspect} → TopicAngle.aspect
 *    - {count} → "5" (기본값)
 * 3. gapScore 내림차순 정렬 → 상위 15개 반환
 * 4. priority: gapScore >= 70 → "high", >= 40 → "medium", else "low"
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

    // 추천 이유 생성 (한국어)
    const trendLabel =
      gap.trend === "rising" ? "상승" : gap.trend === "falling" ? "하락" : "보합";
    const changeRateAbs = Math.abs(gap.changeRate);
    const reasoning =
      gap.existingPostCount === 0
        ? `'${gap.subGroup}' 검색 트렌드 ${trendLabel} (변화율 ${gap.changeRate > 0 ? "+" : ""}${gap.changeRate}%), 관련 포스트 없음`
        : `'${gap.subGroup}' 검색 트렌드 ${changeRateAbs.toFixed(1)}% ${trendLabel}, 관련 포스트 ${gap.existingPostCount}개로 커버리지 부족`;

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
