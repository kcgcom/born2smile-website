// =============================================================
// 트렌드 분석 엔진
// analyzeTrend, analyzeContentGap, generateTopicSuggestions
// =============================================================

import type { BlogBlock, BlogPost } from "./blog/types";
import type { CategoryKeywords, KeywordCategorySlug, SearchIntent } from "./admin-naver-datalab-keywords";

export type TrendDirection = "rising" | "falling" | "stable";

export interface TrendResult {
  direction: TrendDirection;
  /** 전기 대비 변화율 (%), 소수점 1자리 */
  changeRate: number;
  /** 후반부 가중 평균 ratio (카테고리 내 비교용) */
  currentAvg: number;
}

export interface CategoryTrendData {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  subGroups: Array<{
    name: string;
    trend: TrendDirection;
    changeRate: number;
    currentAvg: number;
    data: Array<{ period: string; ratio: number }>;
  }>;
}

export interface ContentGap {
  category: KeywordCategorySlug;
  /** 영어 카테고리 슬러그 */
  slug: KeywordCategorySlug;
  subGroup: string;
  keywords: string[];
  trend: TrendDirection;
  /** 변화율 (%) */
  changeRate: number;
  /** 후반부 평균 ratio (카테고리 내 검색량 지표) */
  currentAvg: number;
  /** title/subtitle/excerpt/tags 키워드 매칭된 포스트 수 */
  existingPostCount: number;
  /** 0~100, 높을수록 현재 콘텐츠의 실질 커버리지가 부족함 */
  contentGapScore: number;
  /** 규칙 기반 전체 본문 유효 커버리지 (0~100) */
  contentCoverage: number;
  /** 관련성이 높은 기존 콘텐츠 근거 */
  coverageEvidence: Array<{ slug: string; title: string; strength: number }>;
  /** 월간 검색량 (검색광고 API 연동 시), null이면 미연동 */
  monthlyVolume: number | null;
  /** 데이터 출처 */
  volumeSource: "searchad" | "datalab-fallback";
  /** "< 10" 추정값 포함 여부 */
  isEstimated: boolean;
  /** 서브그룹에 매칭된 전체 연관 키워드 (검색량 내림차순, 점수 미반영) */
  relatedKeywords: Array<{ keyword: string; volume: number }>;
  /** 주제에 등록된 핵심 키워드별 검색량 */
  directKeywords: Array<{ keyword: string; volume: number }>;
  /** 검색 의도 분류 */
  searchIntent: SearchIntent;
}

// =============================================================
// buildSyntheticCategoryData — DataLab 없이 분류체계만으로 카테고리 데이터 생성
// =============================================================

/**
 * DataLab API 호출 없이 키워드 분류체계만으로 CategoryTrendData[]를 생성한다.
 * 검색 추이 없이 택소노미 구조만 생성한다. 콘텐츠 공백과 행동별 가치는 별도 단계에서 계산한다.
 */
export function buildSyntheticCategoryData(
  categoryKeywords: CategoryKeywords[],
): CategoryTrendData[] {
  return categoryKeywords.map((ck) => ({
    category: ck.category,
    slug: ck.slug,
    subGroups: ck.subGroups.map((sg) => ({
      name: sg.name,
      trend: "stable" as TrendDirection,
      changeRate: 0,
      currentAvg: 0,
      data: [],
    })),
  }));
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

function blockText(block: BlogBlock): string {
  if (block.type === "heading" || block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.join(" ");
  if (block.type === "faq") return `${block.question} ${block.answer}`;
  if (block.type === "image") return `${block.alt} ${block.caption ?? ""}`;
  if (block.type === "relatedLinks") return block.items.map((item) => `${item.title} ${item.description ?? ""}`).join(" ");
  if (block.type === "table") return `${block.headers.join(" ")} ${block.rows.flat().join(" ")}`;
  return `${block.title} ${block.description}`;
}

function normalizeCoverageText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

const CONCEPT_ALIASES = {
  cost: ["비용", "가격", "금액", "보험", "건강보험"],
  symptom: ["증상", "통증", "아픔", "붓기", "부기", "출혈", "시림"],
  cause: ["원인", "이유", "왜"],
  process: ["과정", "방법", "순서", "어떻게", "시술"],
  recovery: ["회복", "기간", "며칠", "일상생활"],
  risk: ["부작용", "위험", "주의", "문제", "합병증"],
  care: ["관리", "양치", "식사", "예방"],
  suitability: ["대상", "가능", "필요", "적합", "시기"],
  comparison: ["비교", "차이", "장단점", "종류"],
} as const;

type ConceptKey = keyof typeof CONCEPT_ALIASES | "topic";

function includedConcepts(value: string, keywords: string[], subGroup: string): Set<ConceptKey> {
  const normalized = normalizeCoverageText(value);
  const concepts = new Set<ConceptKey>();
  for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES) as Array<[keyof typeof CONCEPT_ALIASES, readonly string[]]>) {
    if (aliases.some((alias) => normalized.includes(normalizeCoverageText(alias)))) concepts.add(concept);
  }
  if ([...keywords, subGroup].some((keyword) => {
    const needle = normalizeCoverageText(keyword);
    return needle.length >= 2 && normalized.includes(needle);
  })) concepts.add("topic");
  return concepts;
}

function expectedConcepts(keywords: string[], subGroup: string): Set<ConceptKey> {
  const concepts = includedConcepts(`${subGroup} ${keywords.join(" ")}`, [], "");
  concepts.add("topic");
  return concepts;
}

function freshnessFactor(post: BlogPost): number {
  const value = post.dateModified ?? post.date;
  const ageYears = (Date.now() - new Date(`${value}T00:00:00+09:00`).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears <= 2) return 1;
  if (ageYears <= 4) return 0.8;
  return 0.6;
}

function coverageStrength(post: BlogPost, keywords: string[], subGroup: string) {
  const genericTerms = new Set(["치과", "치료", "병원", "정보", "추천", "김포", "서울본치과"]);
  const needles = [...new Set([...keywords, subGroup])]
    .map(normalizeCoverageText)
    .filter((value) => value.length >= 2 && !genericTerms.has(value));
  if (needles.length === 0) return { strength: 0, concepts: new Set<ConceptKey>() };
  const includesNeedle = (value: string) => {
    const normalized = normalizeCoverageText(value);
    return needles.some((needle) => normalized.includes(needle));
  };
  const titleMatch = includesNeedle(post.title);
  const headingMatches = post.blocks.filter((block) => block.type === "heading" && includesNeedle(block.text)).length;
  const bodyMatches = post.blocks.filter((block) => block.type !== "relatedLinks" && includesNeedle(blockText(block))).length;
  const summaryMatch = includesNeedle(`${post.subtitle} ${post.excerpt}`);
  const tagMatch = includesNeedle(post.tags.join(" "));
  if (!titleMatch && headingMatches === 0 && bodyMatches === 0 && !summaryMatch && !tagMatch) {
    return { strength: 0, concepts: new Set<ConceptKey>() };
  }

  // 제목에 한 번 등장한 긴 글보다 전용 소제목과 여러 본문 블록에서 설명한 글을 높게 평가한다.
  const directness = titleMatch ? 100 : headingMatches > 0 ? 75 : summaryMatch ? 45 : bodyMatches > 0 ? 25 : 10;
  const depth = Math.min(100,
    Math.min(headingMatches, 2) * 20
    + Math.min(bodyMatches, 5) * 12
    + (post.blocks.some((block) => block.type === "faq" && includesNeedle(blockText(block))) ? 15 : 0),
  );
  const relevantTexts = [post.title, post.subtitle, post.excerpt, post.tags.join(" "), ...post.blocks.map(blockText)]
    .filter(includesNeedle);
  const concepts = includedConcepts(relevantTexts.join(" "), keywords, subGroup);
  const expected = expectedConcepts(keywords, subGroup);
  const conceptCoverage = expected.size === 0 ? 0 : [...expected].filter((concept) => concepts.has(concept)).length / expected.size * 100;
  const freshness = freshnessFactor(post) * 100;
  const strength = directness * 0.35 + depth * 0.35 + conceptCoverage * 0.2 + freshness * 0.1;
  return { strength: Math.round(strength), concepts };
}

function analyzeCoverage(posts: BlogPost[], keywords: string[], subGroup: string) {
  const evidence = posts
    .map((post) => ({ slug: post.slug, title: post.title, ...coverageStrength(post, keywords, subGroup) }))
    .filter((item) => item.strength > 0)
    .sort((a, b) => b.strength - a.strength);
  const coveredConcepts = new Set<ConceptKey>();
  let coverage = 0;
  evidence.slice(0, 3).forEach((item, index) => {
    const novelConcepts = [...item.concepts].filter((concept) => !coveredConcepts.has(concept));
    item.concepts.forEach((concept) => coveredConcepts.add(concept));
    const novelty = item.concepts.size === 0 ? 0 : novelConcepts.length / item.concepts.size;
    const weight = index === 0 ? 0.8 : index === 1 ? 0.15 : 0.05;
    // 후속 글은 새로운 개념을 보완할 때만 의미 있게 기여한다.
    coverage += item.strength * weight * (index === 0 ? 1 : 0.25 + novelty * 0.75);
  });
  const roundedCoverage = Math.min(100, Math.round(coverage));
  const contentGapScore = 100 - roundedCoverage;
  return {
    evidence: evidence.slice(0, 5).map(({ slug, title, strength }) => ({ slug, title, strength })),
    matchCount: evidence.length,
    coverage: roundedCoverage,
    contentGapScore,
  };
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
  /** 서브그룹에 매칭된 전체 연관 키워드 (검색량 내림차순, 점수 미반영) */
  relatedKeywords?: Array<{ keyword: string; volume: number }>;
  /** 주제에 등록된 핵심 키워드별 검색량 */
  directKeywords?: Array<{ keyword: string; volume: number }>;
}

/**
 * 트렌드 데이터와 발행된 블로그 포스트를 교차 분석하여 콘텐츠 갭을 식별한다.
 *
 * opportunity-v1.0 콘텐츠 공백 분석.
 * 검색량과 검색 추이는 섞지 않고 전체 본문의 주제 커버리지만 계산한다.
 */
export function analyzeContentGap(
  categoryData: CategoryTrendData[],
  publishedPosts: BlogPost[],
  categoryKeywords?: CategoryKeywords[],
  volumeData?: Record<string, VolumeDataEntry>,
): ContentGap[] {
  const gaps: ContentGap[] = [];
  for (const catData of categoryData) {
    // 전체 포스트 대상으로 키워드 매칭 (카테고리 무관하게 콘텐츠 커버리지 측정)
    const categoryPosts = publishedPosts;

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
      contentGapScore: number;
      contentCoverage: number;
      coverageEvidence: Array<{ slug: string; title: string; strength: number }>;
      monthlyVolume: number | null;
      isEstimated: boolean;
      relatedKeywords: Array<{ keyword: string; volume: number }>;
      directKeywords: Array<{ keyword: string; volume: number }>;
      searchIntent: SearchIntent;
    }> = [];

    for (const sg of catData.subGroups) {
      // 원본 키워드 배열 조회
      const subGroupDef = catKw?.subGroups.find((s) => s.name === sg.name);
      const keywords = subGroupDef?.keywords ?? [];

      const coverage = analyzeCoverage(categoryPosts, keywords, sg.name);

      // 검색광고 검색량 조회 (key = "카테고리:서브그룹")
      const volumeKey = `${catData.category}:${sg.name}`;
      const vol = volumeData?.[volumeKey];

      catGaps.push({
        subGroup: sg.name,
        keywords,
        trend: sg.trend,
        changeRate: sg.changeRate,
        currentAvg: sg.currentAvg,
        existingPostCount: coverage.matchCount,
        contentGapScore: coverage.contentGapScore,
        contentCoverage: coverage.coverage,
        coverageEvidence: coverage.evidence,
        monthlyVolume: vol?.monthlyTotalQcCnt ?? null,
        isEstimated: vol?.isEstimated ?? false,
        relatedKeywords: vol?.relatedKeywords ?? [],
        directKeywords: vol?.directKeywords ?? [],
        searchIntent: subGroupDef?.searchIntent ?? "informational",
      });
    }

    for (const g of catGaps) {
      gaps.push({
        category: catData.category,
        slug: catData.slug,
        subGroup: g.subGroup,
        keywords: g.keywords,
        trend: g.trend,
        changeRate: g.changeRate,
        currentAvg: g.currentAvg,
        existingPostCount: g.existingPostCount,
        contentGapScore: g.contentGapScore,
        contentCoverage: g.contentCoverage,
        coverageEvidence: g.coverageEvidence,
        monthlyVolume: g.monthlyVolume,
        volumeSource: g.monthlyVolume != null ? "searchad" : "datalab-fallback",
        isEstimated: g.isEstimated,
        relatedKeywords: g.relatedKeywords,
        directKeywords: g.directKeywords,
        searchIntent: g.searchIntent,
      });
    }
  }

  return gaps.sort((a, b) => b.contentGapScore - a.contentGapScore || (b.monthlyVolume ?? 0) - (a.monthlyVolume ?? 0));
}
