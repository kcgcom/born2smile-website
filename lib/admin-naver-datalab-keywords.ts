// =============================================================
// 네이버 DataLab 키워드 택소노미
// 8개 카테고리 × 최대 15개 서브그룹 (브릿지 배칭으로 5개 제한 해제)
// =============================================================

import { BLOG_CATEGORY_LABELS } from "./blog";
import type { BlogCategoryLabel, BlogCategorySlug } from "./blog/types";

export type KeywordCategorySlug = BlogCategorySlug | "dental-choice";
export type KeywordCategoryLabel = BlogCategoryLabel | "치과선택";

export const KEYWORD_CATEGORY_LABELS: Record<KeywordCategorySlug, KeywordCategoryLabel> = {
  ...BLOG_CATEGORY_LABELS,
  "dental-choice": "치과선택",
};

export function isKeywordCategorySlug(value: string): value is KeywordCategorySlug {
  return value in KEYWORD_CATEGORY_LABELS;
}

export function getKeywordCategoryLabel(category: KeywordCategorySlug): KeywordCategoryLabel {
  return KEYWORD_CATEGORY_LABELS[category];
}

export type SearchIntent = "informational" | "commercial" | "transactional" | "navigational";

export interface KeywordSubGroup {
  name: string;             // 서브그룹명 (예: "비용/가격")
  keywords: string[];       // 최대 20개 키워드 (네이버 DataLab API 그룹당 최대 20개), 앞 2개 = 검색량 조회 대표
  searchIntent: SearchIntent; // 검색 의도 분류
}

/** keywords 배열의 앞 2개를 검색광고 API 검색량 조회용 대표 키워드로 반환 */
export function getVolumeKeywords(sg: KeywordSubGroup): string[] {
  return sg.keywords.slice(0, 2);
}

export interface TopicAngle {
  template: string;  // 제목 템플릿 (예: "{year}년 {keyword} 총정리: {aspect}")
  subGroup: string;  // 연결된 서브그룹명 (KeywordSubGroup.name과 일치)
  aspect: string;    // 절사 앵글 (예: "건강보험 적용부터 종류별 가격 비교까지")
}

export interface CategoryKeywords {
  category: KeywordCategorySlug; // canonical category slug
  slug: KeywordCategorySlug;     // 영어 URL 슬러그
  subGroups: KeywordSubGroup[]; // 최대 15개 서브그룹 (브릿지 배칭 지원)
  topicAngles: TopicAngle[];   // 블로그 주제 템플릿
}

// =============================================================
// CATEGORY_KEYWORDS — 8개 카테고리 키워드 택소노미
// =============================================================

export const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  // ─────────────────────────────────────────────────────────
  // 임플란트 (implant)
  // ─────────────────────────────────────────────────────────
  {
    category: "implant",
    slug: "implant",
    subGroups: [
      {
        name: "비용/가격",
        keywords: [
          "임플란트 비용", "임플란트 가격", "임플란트 보험",
          "임플란트 건강보험", "임플란트 얼마", "임플란트 평균 비용",
          "임플란트 본인부담금", "노인 임플란트 비용",
          "임플란트 1개 가격 얼마인가요", "65세 임플란트 건강보험 적용 방법",
          "임플란트 실비보험 청구 되나요", "임플란트 vs 브릿지 비용 차이",
        ],
        searchIntent: "commercial",
      },
      {
        name: "과정/기간",
        keywords: [
          "임플란트 과정", "임플란트 기간", "임플란트 수술",
          "뼈이식", "임플란트 식립", "임플란트 치유기간",
          "뼈이식 임플란트", "임플란트 완성까지",
          "임플란트 수술 몇번 가야하나요", "뼈이식 후 임플란트 기간 얼마나 걸리나요",
          "임플란트 1차 2차 수술 차이", "발치 후 임플란트 바로 할 수 있나요",
        ],
        searchIntent: "informational",
      },
      {
        name: "부작용/관리",
        keywords: [
          "임플란트 부작용", "임플란트 관리", "임플란트 통증",
          "임플란트 실패", "임플란트 수명", "임플란트 후기",
          "임플란트 염증", "임플란트 주의사항", "임플란트 수술 후 음식 언제부터 먹나요",
          "임플란트 후 흡연하면 어떻게 되나요", "임플란트 수명 몇년인가요", "임플란트 실패 확률 얼마나 되나요"
        ],
        searchIntent: "informational",
      },
      {
        name: "종류/브랜드",
        keywords: [
          "임플란트 종류", "오스템 임플란트", "스트라우만 임플란트",
          "덴티움 임플란트", "임플란트 브랜드 비교", "국산 임플란트",
          "수입 임플란트", "임플란트 추천", "전치부 임플란트",
          "임플란트 보증기간", "오스템 vs 스트라우만 뭐가 좋나요",
          "국산 임플란트 수입 임플란트 차이", "임플란트 브랜드 어떤 게 오래가나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "대상/조건",
        keywords: [
          "당뇨 임플란트", "임플란트 조건", "고혈압 임플란트",
          "노인 임플란트", "임플란트 나이", "잇몸 임플란트",
          "뼈 없는 임플란트", "임플란트 가능 여부", "당뇨 있으면 임플란트 못하나요",
          "혈압약 먹는데 임플란트 가능한가요", "뼈가 부족한데 임플란트 할 수 있나요", "70대 임플란트 괜찮을까요"
        ],
        searchIntent: "informational",
      },
      {
        name: "첨단/디지털",
        keywords: [
          "원데이 임플란트", "즉시 임플란트", "네비게이션 임플란트",
          "디지털 임플란트", "3D 임플란트", "무절개 임플란트",
          "가이드 임플란트", "즉시 식립", "원데이 임플란트 당일 식사 가능한가요",
          "네비게이션 임플란트 일반 수술 차이", "무절개 임플란트 통증 적나요", "즉시 식립 vs 지연 식립 뭐가 좋을까"
        ],
        searchIntent: "commercial",
      },
      {
        name: "임플란트 잇몸",
        keywords: [
          "임플란트 주위염", "임플란트 잇몸 염증", "잇몸 이식",
          "임플란트 잇몸 관리", "임플란트 잇몸 통증", "임플란트 잇몸 퇴축",
          "임플란트 점막염", "임플란트 주위에 잇몸이 내려가요", "임플란트 잇몸 염증 자연 치유 되나요",
          "임플란트 주위염 vs 치주염 차이"
        ],
        searchIntent: "informational",
      },
      {
        name: "문제/재수술",
        keywords: [
          "임플란트 흔들림", "임플란트 재수술", "임플란트 빠짐",
          "임플란트 탈락", "임플란트 제거", "임플란트 재식립",
          "임플란트 나사 풀림", "임플란트 보철 흔들림", "임플란트 크라운 흔들림",
          "오래된 임플란트", "10년 된 임플란트", "임플란트 흔들리면 꼭 재수술 해야 하나요",
          "임플란트 10년 넘으면 교체해야 하나요", "임플란트 나사 풀림 응급 처치 방법", "임플란트 재수술 비용 보험 되나요"
        ],
        searchIntent: "transactional",
      },
    ],
    topicAngles: [
      {
        template: "{year}년 {keyword} 총정리: {aspect}",
        subGroup: "비용/가격",
        aspect: "건강보험 적용부터 종류별 가격 비교까지",
      },
      {
        template: "{keyword}, 꼭 알아야 할 {count}가지",
        subGroup: "과정/기간",
        aspect: "",
      },
      {
        template: "{keyword} 비교: {aspect}",
        subGroup: "종류/브랜드",
        aspect: "오스템 vs 스트라우만, 어떤 게 좋을까?",
      },
      {
        template: "{keyword} 완벽 가이드: {aspect}",
        subGroup: "대상/조건",
        aspect: "나에게 맞는 치료 조건 확인법",
      },
      {
        template: "{keyword} 예방과 대처법 {count}가지",
        subGroup: "부작용/관리",
        aspect: "",
      },
      {
        template: "{keyword} 최신 가이드: {aspect}",
        subGroup: "첨단/디지털",
        aspect: "원데이·네비게이션·즉시 식립 차이점 비교",
      },
      {
        template: "{keyword} 예방과 치료: {aspect}",
        subGroup: "임플란트 잇몸",
        aspect: "주위염부터 잇몸재생까지 완벽 관리법",
      },
      {
        template: "{keyword}, 재수술이 필요할까? {aspect}",
        subGroup: "문제/재수술",
        aspect: "나사 풀림과 픽스처 문제 구분부터 치료 순서까지",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 치아교정 (orthodontics)
  // ─────────────────────────────────────────────────────────
  {
    category: "orthodontics",
    slug: "orthodontics",
    subGroups: [
      {
        name: "종류/방법",
        keywords: [
          "투명교정", "치아교정 종류", "인비절라인",
          "세라믹 교정", "금속 교정", "설측 교정",
          "부분 교정", "교정 방법", "클리피씨 교정",
          "투명교정 vs 세라믹교정 뭐가 좋을까", "부분교정 앞니만 가능한가요", "설측교정 안 보이는 교정 차이",
          "인비절라인 일반 투명교정 차이점", "교정 종류별 장단점 비교"
        ],
        searchIntent: "informational",
      },
      {
        name: "비용/기간",
        keywords: [
          "치아교정 비용", "교정 기간", "교정 가격",
          "투명교정 비용", "치아교정 기간", "성인 교정 비용",
          "교정 얼마", "교정 치료 기간", "치아교정 비용 분할납부 가능한가요",
          "투명교정 세라믹교정 비용 차이 얼마나", "교정 기간 보통 몇년 걸리나요", "성인 교정 비용 실비보험 되나요",
          "부분교정 비용 전체교정보다 싼가요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "부작용/관리",
        keywords: [
          "교정 통증", "교정 부작용", "교정 후 관리",
          "교정 주의사항", "교정 중 음식", "교정기 관리",
          "교정 후 후퇴", "유지장치",
          "교정 철사 조인 후 통증 얼마나 가나요", "교정 후 유지장치 안 끼면 어떻게 되나요",
          "교정 중 충치 생기면 어떡하나요", "교정 후 치아 흔들림 정상인가요",
          "유지장치 기간 평생 해야 하나요",
        ],
        searchIntent: "informational",
      },
      {
        name: "대상/나이",
        keywords: [
          "성인 교정", "교정 나이", "청소년 교정",
          "30대 교정", "40대 교정", "교정 적합 나이",
          "40대 교정 늦지 않나요", "초등학생 교정 언제 시작하나요", "성인 교정 소아 교정 차이점",
          "방학에 교정 시작하면 좋은 이유", "직장인 교정 티 안나는 방법"
        ],
        searchIntent: "informational",
      },
      {
        name: "생활/관리",
        keywords: [
          "교정 칫솔질", "교정 중 관리", "교정 식사",
          "교정 구강위생", "교정 칫솔", "교정 치간칫솔",
          "교정 후 유지", "교정 리테이너", "교정 중 못 먹는 음식 뭐가 있나요",
          "교정 칫솔질 하루 몇번 해야 하나요", "교정 중 치실 사용법", "교정 리테이너 세척 방법",
          "교정 중 여행 갈 때 준비물"
        ],
        searchIntent: "informational",
      },
      {
        name: "심미/고민",
        keywords: [
          "돌출입 교정", "덧니 교정", "교정 전후",
          "벌어진 앞니 교정", "주걱턱 교정", "무턱 교정",
          "비대칭 교정", "교정 얼굴 변화",
          "돌출입 교정 얼굴형 변하나요", "덧니 교정 발치 꼭 해야 하나요",
          "벌어진 앞니 부분교정으로 되나요", "교정하면 얼굴 갸름해지나요",
          "결혼 전 교정 기간 맞출 수 있나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "교정비교/선택",
        keywords: [
          "인비절라인 가격", "투명교정 후기", "교정 추천",
          "교정 병원 추천", "투명교정 비교", "인비절라인 후기",
          "교정 잘하는 치과", "교정 상담",
          "인비절라인 일반 투명교정 효과 차이", "교정과 전문의 일반 치과 차이",
          "교정 상담 시 확인해야 할 것들", "교정 잘하는 치과 고르는 기준",
          "투명교정 브랜드별 가격 비교",
        ],
        searchIntent: "transactional",
      },
    ],
    topicAngles: [
      {
        template: "{keyword} 완벽 비교: {aspect}",
        subGroup: "종류/방법",
        aspect: "내 치아에 맞는 교정 방법 고르는 법",
      },
      {
        template: "{year}년 {keyword} 현실 가이드: {aspect}",
        subGroup: "비용/기간",
        aspect: "종류별 비용과 예상 기간 총정리",
      },
      {
        template: "{keyword} 극복하는 {count}가지 방법",
        subGroup: "부작용/관리",
        aspect: "",
      },
      {
        template: "{keyword}도 교정 가능할까? {aspect}",
        subGroup: "대상/나이",
        aspect: "나이별 교정 시작 가이드",
      },
      {
        template: "{keyword} 중 꼭 알아야 할 생활 관리법 {count}가지",
        subGroup: "생활/관리",
        aspect: "",
      },
      {
        template: "{keyword} 전후 변화: {aspect}",
        subGroup: "심미/고민",
        aspect: "교정으로 달라지는 얼굴형과 자신감",
      },
      {
        template: "{keyword} 비교 가이드: {aspect}",
        subGroup: "교정비교/선택",
        aspect: "인비절라인부터 세라믹까지 비용·기간·효과 비교",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 보철치료 (prosthetics)
  // ─────────────────────────────────────────────────────────
  {
    category: "prosthetics",
    slug: "prosthetics",
    subGroups: [
      {
        name: "크라운",
        keywords: [
          "치아 크라운", "크라운 비용", "크라운",
          "크라운 수명", "크라운 치료", "크라운 과정",
          "크라운 통증", "치관 보철", "크라운 안하면 어떻게 되나요",
          "크라운 씌운 후 통증 정상인가요", "크라운 수명 보통 몇년인가요", "신경치료 후 크라운 꼭 해야 하나요",
          "크라운 빠졌을 때 응급 처치법"
        ],
        searchIntent: "informational",
      },
      {
        name: "브릿지",
        keywords: [
          "치아 브릿지", "브릿지 비용", "브릿지",
          "브릿지 수명", "브릿지 치료", "브릿지 종류",
          "임플란트 브릿지 비교", "브릿지 vs 임플란트 뭐가 좋을까", "브릿지 옆 치아 삭제 얼마나 하나요",
          "브릿지 수명 다하면 재치료 어떻게", "앞니 브릿지 자연스러운가요", "브릿지 밑 음식 낌 관리법"
        ],
        searchIntent: "commercial",
      },
      {
        name: "틀니",
        keywords: [
          "틀니", "틀니 비용", "부분틀니",
          "완전틀니", "임플란트 틀니", "틀니 관리",
          "틀니 종류", "틀니 적응", "임플란트 틀니 vs 일반 틀니 차이",
          "틀니 처음 끼면 적응 기간 얼마나", "틀니 세척 방법 올바른 관리법", "부분틀니 불편한데 임플란트로 바꿀 수 있나요",
          "65세 틀니 건강보험 적용 되나요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "라미네이트",
        keywords: [
          "라미네이트", "라미네이트 비용", "라미네이트 수명",
          "앞니 라미네이트", "라미네이트 후기", "라미네이트 부작용",
          "치아 성형", "심미 보철",
          "라미네이트 치아 삭제 많이 하나요", "라미네이트 vs 레진 앞니 뭐가 나을까",
          "라미네이트 깨지면 재치료 비용", "결혼 전 라미네이트 기간 맞출 수 있나요",
          "라미네이트 후 시림 현상 괜찮나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "치아미백",
        keywords: [
          "치아 미백", "치아미백 비용", "자가미백",
          "전문미백", "치아미백 효과", "치아미백 부작용",
          "미백 치약", "치아 변색", "치아 착색",
          "치아착색 원인", "치아 누런색",
          "자가미백 vs 전문미백 효과 차이", "치아미백 효과 얼마나 오래가나요",
          "미백 후 시린 증상 괜찮나요", "커피 마시면 미백 효과 떨어지나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "비용",
        keywords: [
          "보철 비용", "크라운 가격", "치아 보철 가격",
          "보철 치료 비용", "치과 보철 얼마", "보험 적용 보철",
          "보철 건강보험", "보철 본인부담", "크라운 보험 적용 되나요",
          "보철 치료 실비보험 청구 방법", "지르코니아 vs 골드 크라운 가격 차이", "65세 보철 건강보험 혜택 총정리",
          "보철 비용 분할납부 가능한가요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "소재/종류",
        keywords: [
          "지르코니아", "골드 크라운", "PFM 크라운",
          "올세라믹", "금 크라운", "보철 소재",
          "지르코니아 크라운", "세라믹 크라운", "지르코니아 vs 골드 크라운 뭐가 좋나요",
          "올세라믹 PFM 차이점", "어금니 크라운 소재 추천", "금 크라운 알레르기 있나요",
          "보철 소재별 수명 비교"
        ],
        searchIntent: "commercial",
      },
      {
        name: "앞니치료",
        keywords: [
          "앞니 크라운", "앞니 깨짐", "앞니 레진",
          "앞니 보철", "앞니 임플란트", "앞니 치료 비용",
          "앞니 브릿지", "앞니 성형",
          "앞니 깨졌을 때 응급 처치법", "앞니 레진 vs 라미네이트 vs 크라운 비교",
          "앞니 임플란트 자연스러운가요", "앞니 치료 당일 가능한가요",
          "앞니 보철 색상 맞추기 가능한가요",
        ],
        searchIntent: "transactional",
      },
    ],
    topicAngles: [
      {
        template: "{keyword} 완벽 가이드: {aspect}",
        subGroup: "크라운",
        aspect: "소재별 장단점부터 수명·비용까지",
      },
      {
        template: "{keyword} vs 임플란트: {aspect}",
        subGroup: "브릿지",
        aspect: "상황별 최선의 치료 선택 가이드",
      },
      {
        template: "{keyword} 종류와 비용: {aspect}",
        subGroup: "틀니",
        aspect: "부분틀니부터 임플란트 틀니까지",
      },
      {
        template: "{keyword} {count}가지 핵심 정보: {aspect}",
        subGroup: "소재/종류",
        aspect: "소재별 장단점 완벽 비교",
      },
      {
        template: "{keyword} 전후 비교: {aspect}",
        subGroup: "라미네이트",
        aspect: "앞니 라미네이트 수명과 관리법",
      },
      {
        template: "{keyword} 완벽 가이드: {aspect}",
        subGroup: "치아미백",
        aspect: "자가미백 vs 전문미백, 효과와 비용 비교",
      },
      {
        template: "{year}년 {keyword} 현실 가이드: {aspect}",
        subGroup: "비용",
        aspect: "건강보험 적용 범위와 실제 부담 비용",
      },
      {
        template: "{keyword} 치료 옵션 비교: {aspect}",
        subGroup: "앞니치료",
        aspect: "레진·라미네이트·크라운, 내 앞니에 맞는 선택",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 보존치료 (restorative)
  // ─────────────────────────────────────────────────────────
  {
    category: "restorative",
    slug: "restorative",
    subGroups: [
      {
        name: "충치치료",
        keywords: [
          "충치치료", "충치 비용", "충치 초기",
          "충치 증상", "충치 방치", "충치 치료 과정",
          "2차 충치", "충치 단계", "충치 방치하면 어떻게 되나요",
          "충치 초기 자연 치유 가능한가요", "충치 치료 아프지 않게 하는 방법", "2차 충치 왜 생기나요 예방법",
          "충치 치료 보험 적용 범위"
        ],
        searchIntent: "informational",
      },
      {
        name: "신경치료",
        keywords: [
          "신경치료", "신경치료 비용", "신경치료 과정",
          "신경치료 통증", "신경치료 기간", "신경치료 후 크라운",
          "치수염", "신경치료 후 관리", "신경치료 아프나요 마취 안 되면",
          "신경치료 몇번 가야 하나요", "신경치료 후 크라운 안하면 어떻게 되나요", "신경치료 후 통증 얼마나 가나요",
          "신경치료 vs 발치 어떤 게 나을까"
        ],
        searchIntent: "informational",
      },
      {
        name: "레진",
        keywords: [
          "레진 치료", "레진 비용", "레진",
          "레진 수명", "레진 변색", "레진 탈락",
          "앞니 레진", "레진 충전", "레진 vs 인레이 뭐가 좋을까",
          "레진 변색되면 다시 해야 하나요", "앞니 레진 자연스러운가요", "레진 탈락 임시 응급 처치법",
          "레진 수명 보통 몇년인가요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "인레이/온레이",
        keywords: [
          "인레이 비용", "인레이", "온레이",
          "인레이 수명", "세라믹 인레이", "골드 인레이",
          "인레이 탈락", "인레이 치료", "인레이 vs 레진 vs 크라운 차이점",
          "골드 인레이 세라믹 인레이 뭐가 좋나요", "인레이 탈락 다시 붙일 수 있나요", "온레이 크라운 차이 경계가 어디인가요",
          "인레이 보험 적용 되나요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "통증/관리",
        keywords: [
          "이갈이", "치아 시림", "턱관절",
          "차가운 음식 통증", "단 음식 통증", "치아 균열",
          "크랙 치아", "지각과민", "이 시림 치료",
          "시린이", "이갈이 마우스피스", "턱관절 치료",
          "이 시림 치약", "찬물 마시면 이가 시린 이유", "이갈이 마우스피스 효과 있나요",
          "턱관절 소리 나는데 치과 가야 하나요", "치아 균열 자가진단 방법"
        ],
        searchIntent: "informational",
      },
      {
        name: "예방",
        keywords: [
          "치아 관리",
          "불소 치약", "치실",
          "치아 마모", "에나멜 보호",
          "불소 치약 어린이 어른 차이", "전동칫솔 일반칫솔 뭐가 좋을까",
          "치실 치간칫솔 뭘 써야 하나요", "치아 마모 예방하는 칫솔질 방법",
          "에나멜 한번 닳으면 복원 안 되나요",
        ],
        searchIntent: "informational",
      },
      {
        name: "증상/자가진단",
        keywords: [
          "이가 시려요", "이가 아파요", "잇몸에서 피나요",
          "이가 흔들려요", "이 색이 변했어요", "이가 깨졌어요",
          "잇몸이 부었어요", "이가 욱신거려요", "이가 아픈데 충치인지 신경인지 구별법",
          "잇몸 출혈 양치할때만 나면 괜찮나요", "이가 흔들리면 빠지나요 치료 가능한가요", "밤에 갑자기 이가 아플때 응급 처치법",
          "치아 색 변했으면 신경 죽은 건가요"
        ],
        searchIntent: "informational",
      },
      {
        name: "사랑니",
        keywords: [
          "사랑니 발치", "사랑니 통증", "사랑니",
          "매복 사랑니", "사랑니 발치 비용", "사랑니 발치 후 관리",
          "사랑니 부분 매복", "사랑니 염증", "사랑니 발치 기간",
          "사랑니 꼭 뽑아야 하나요", "사랑니 발치 후 흡연 언제부터", "매복 사랑니 발치 위험한가요",
          "사랑니 발치 후 음식 뭐 먹나요", "군대 전 사랑니 미리 뽑아야 하나요"
        ],
        searchIntent: "informational",
      },
    ],
    topicAngles: [
      {
        template: "{keyword} 단계별 완전 가이드: {aspect}",
        subGroup: "충치치료",
        aspect: "초기 발견부터 치료 완료까지",
      },
      {
        template: "{keyword}이 두려운 당신에게: {aspect}",
        subGroup: "신경치료",
        aspect: "과정과 통증 대처법 솔직 후기",
      },
      {
        template: "{keyword} 완벽 가이드: {aspect}",
        subGroup: "레진",
        aspect: "충전 치료의 장단점과 관리법",
      },
      {
        template: "{keyword} vs 레진 비교: {aspect}",
        subGroup: "인레이/온레이",
        aspect: "내 치아엔 어떤 수복 치료가 맞을까?",
      },
      {
        template: "{keyword} 원인과 해결법 {count}가지",
        subGroup: "통증/관리",
        aspect: "",
      },
      {
        template: "{keyword}로 치아 수명 늘리는 {count}가지 방법",
        subGroup: "예방",
        aspect: "",
      },
      {
        template: "{keyword}? 증상별 원인과 대처법: {aspect}",
        subGroup: "증상/자가진단",
        aspect: "치과 가기 전 셀프 체크 가이드",
      },
      {
        template: "{keyword} 완벽 가이드: {aspect}",
        subGroup: "사랑니",
        aspect: "비용·통증·회복기간, 발치 전 꼭 알아야 할 것들",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 소아치료 (pediatric)
  // ─────────────────────────────────────────────────────────
  {
    category: "pediatric",
    slug: "pediatric",
    subGroups: [
      {
        name: "소아진료",
        keywords: [
          "소아치과", "어린이 충치", "어린이 치과",
          "아이 치과", "소아 치과 공포", "소아 치과 진정치료",
          "소아 충치 치료", "어린이 치과 비용", "아이가 치과를 무서워해요 어떻게 하나요",
          "소아 진정치료 안전한가요", "어린이 충치 치료 보험 적용 되나요", "아이 치과 첫 방문 몇살부터",
          "소아치과 일반치과 차이점"
        ],
        searchIntent: "transactional",
      },
      {
        name: "유치관리",
        keywords: [
          "유치 충치", "유치 관리", "유치",
          "유치 빠지는 시기", "유치 뽑는 시기", "유치 영구치",
          "유치 보존", "유치 치료 필요성", "유치 충치 어차피 빠지는데 치료해야 하나요",
          "유치 빠지는 순서 시기 정리", "유치 안 빠지고 영구치 나오면 어떡하나요", "유치 일찍 빠지면 교정 필요한가요",
          "유치 흔들리는데 억지로 뽑아도 되나요"
        ],
        searchIntent: "informational",
      },
      {
        name: "교정시기",
        keywords: [
          "소아 교정", "교정 시작 나이", "어린이 교정",
          "조기 교정", "초등학생 교정", "어린이 교정 시기",
          "혼합치열 교정", "성장기 교정", "아이 교정 몇살에 시작하면 좋을까",
          "초등학생 방학 때 교정 시작하면 좋은 이유", "혼합치열기 교정 빨리 하면 좋은가요", "아이 덧니 교정 시기 놓치면 어떻게 되나요",
          "조기교정 vs 영구치 교정 차이"
        ],
        searchIntent: "informational",
      },
      {
        name: "습관/예방",
        keywords: [
          "손가락 빨기", "어린이 칫솔질", "구강 호흡",
          "이갈기 아이", "아이 치아 관리", "젖병 충치",
          "아이 구강 습관", "치아 발육", "손가락 빨기 치아에 영향 있나요",
          "아이 구강호흡 고치는 방법", "젖병 충치 예방 밤중 수유 괜찮나요", "어린이 칫솔질 올바른 방법 연령별",
          "아이 이갈이 자면서 하는데 치과 가야 하나요"
        ],
        searchIntent: "informational",
      },
      {
        name: "불소도포",
        keywords: [
          "불소 도포", "어린이 불소", "불소 효과",
          "불소 안전성", "불소 바니쉬", "불소 도포 비용",
          "불소 도포 주기", "불소 치약 어린이",
          "불소 도포 몇살부터 하나요", "불소 삼키면 위험한가요",
          "불소 도포 몇개월마다 해야 하나요", "불소 바니쉬 vs 불소 젤 차이",
          "어린이 불소 치약 농도 얼마가 좋나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "홈메우기",
        keywords: [
          "홈메우기", "실란트 비용", "실란트",
          "치면 열구 전색", "홈메우기 비용", "홈메우기 효과",
          "어린이 홈메우기", "홈메우기 보험", "홈메우기 보험 적용 나이 제한",
          "실란트 떨어지면 다시 해야 하나요", "홈메우기 vs 불소 도포 뭐가 좋을까", "홈메우기 아프나요 아이가 겁내요",
          "실란트 효과 기간 얼마나 가나요"
        ],
        searchIntent: "commercial",
      },
      {
        name: "소아응급/외상",
        keywords: [
          "아이 치통", "유치 빠짐", "아이 이 부러짐",
          "아이 이 빠졌을때", "유치 외상", "아이 치아 부딪힘",
          "유치 탈구", "어린이 치아 응급", "아이 입 부딪힘",
          "유치 깨짐", "아이 이 부딪혀서 빠졌을때 응급처치", "영구치 빠졌을때 다시 심을 수 있나요",
          "유치 깨졌는데 치과 바로 가야 하나요", "아이 입 부딪힘 골든타임 몇시간", "빠진 치아 보관법 우유에 넣으라는데"
        ],
        searchIntent: "informational",
      },
    ],
    topicAngles: [
      {
        template: "아이 {keyword} 언제 가야 할까? {aspect}",
        subGroup: "소아진료",
        aspect: "연령별 소아 치과 방문 가이드",
      },
      {
        template: "{keyword} 시기와 관리법: {aspect}",
        subGroup: "유치관리",
        aspect: "유치가 영구치에 미치는 영향",
      },
      {
        template: "우리 아이 {keyword}, 언제 시작해야 할까?",
        subGroup: "교정시기",
        aspect: "",
      },
      {
        template: "우리 아이 {keyword}, {aspect}",
        subGroup: "습관/예방",
        aspect: "올바른 구강 습관 만들기 가이드",
      },
      {
        template: "{keyword} 효과와 비용: {aspect}",
        subGroup: "불소도포",
        aspect: "연령별 불소 도포 시기와 안전성 가이드",
      },
      {
        template: "{keyword} 꼭 해야 할까? {aspect}",
        subGroup: "홈메우기",
        aspect: "효과·비용·보험 적용까지 완벽 정리",
      },
      {
        template: "아이 {keyword} 응급 대처법: {aspect}",
        subGroup: "소아응급/외상",
        aspect: "골든타임 내 부모가 해야 할 것들",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 예방관리 (prevention)
  // ─────────────────────────────────────────────────────────
  {
    category: "prevention",
    slug: "prevention",
    subGroups: [
      {
        name: "스케일링",
        keywords: [
          "스케일링", "스케일링 비용", "스케일링 보험",
          "스케일링 주기", "스케일링 효과", "스케일링 후기",
          "스케일링 통증", "치석 제거",
          "스케일링 1년에 몇번 보험 되나요", "스케일링 아픈데 안 아프게 하는 방법",
          "스케일링 후 이 시림 정상인가요", "스케일링 vs 에어플로우 차이점",
          "스케일링 주기 6개월 1년 뭐가 맞나요", "스케일링 후 주의사항",
        ],
        searchIntent: "commercial",
      },
      {
        name: "잇몸질환",
        keywords: [
          "잇몸질환", "치주염", "치은염",
          "잇몸 치료", "치주 치료", "잇몸 붓기",
          "잇몸 출혈", "잇몸 내려앉음", "잇몸 퇴축",
          "치조골 흡수", "잇몸약", "잇몸 영양제",
          "잇몸에서 피나는데 치주염인가요", "치은염 vs 치주염 차이 구별법",
          "잇몸 내려앉은 것 다시 올라오나요", "잇몸 영양제 효과 있나요",
        ],
        searchIntent: "informational",
      },
      {
        name: "구강위생",
        keywords: [
          "치실 사용법", "전동칫솔", "치간칫솔",
          "워터픽", "올바른 칫솔질", "구강 세정기",
          "치아 관리 방법", "구강 관리 루틴", "워터픽 치실 대신 써도 되나요",
          "전동칫솔 vs 일반칫솔 잇몸에 좋은 건", "식후 칫솔질 타이밍", "치간칫솔 사이즈 고르는 방법",
          "구강세정기 추천 워터픽 vs 일반 세정기"
        ],
        searchIntent: "informational",
      },
      {
        name: "구취",
        keywords: [
          "구취", "입냄새 원인", "입 냄새",
          "구취 치료", "입냄새 제거", "혀 세정",
          "구취 예방", "아침 입냄새", "양치해도 입냄새 나는 이유",
          "입냄새 치과 문제 vs 위장 문제 구별법", "혀 닦으면 입냄새 줄어드나요", "구취 치과에서 치료 가능한가요",
          "마스크 쓰면 입냄새 심한 이유"
        ],
        searchIntent: "informational",
      },
      {
        name: "정기검진",
        keywords: [
          "치과 정기검진", "치과 검진 주기", "치과 X선",
          "치과 정기 방문", "치아 검사", "구강 검진",
          "치과 예방", "정기 스케일링",
          "치과 검진 얼마나 자주 가야 하나요", "치과 X선 자주 찍으면 해로운가요",
          "아이 치과 정기검진 몇살부터", "치과 검진 비용 보험 적용 되나요",
          "증상 없어도 치과 가야 하나요",
        ],
        searchIntent: "transactional",
      },
      {
        name: "에어플로우",
        keywords: [
          "에어플로우", "에어플로우 스케일링", "에어플로우 비용",
          "에어플로우 효과", "에어플로우 후기", "에어플로우 통증",
          "파우더 스케일링", "에어플로우 치석",
          "에어플로우 일반 스케일링보다 덜 아프나요", "에어플로우 착색 제거 효과 어느정도",
          "에어플로우 보험 적용 안 되나요", "에어플로우 vs 미백 차이점",
          "에어플로우 후 주의사항 음식",
        ],
        searchIntent: "commercial",
      },
      {
        name: "잇몸재생/치료",
        keywords: [
          "잇몸재생주사", "잇몸재생술", "잇몸 퇴축 치료",
          "잇몸 이식 수술", "치조골 재생", "잇몸 재건",
          "잇몸재생 비용", "잇몸 퇴축 원인",
          "잇몸재생주사 효과 얼마나 가나요", "잇몸 퇴축 자연 회복 가능한가요",
          "잇몸 이식 수술 통증 심한가요", "잇몸재생 vs 임플란트 뭐가 나을까",
          "치조골 재생 보험 적용 되나요",
        ],
        searchIntent: "transactional",
      },
      {
        name: "구강건조/타액",
        keywords: [
          "구강건조증", "입 마름", "약 부작용 입마름",
          "타액 분비 감소", "구강건조 치료", "입 마름 원인",
          "구강건조 예방", "침 분비 촉진",
          "약 먹고 입 마르는데 치과 가야 하나요", "구강건조증 충치 잘 생기나요",
          "침이 안 나오면 어떤 문제 생기나요", "구강건조 예방 생활습관 팁",
          "입 마름 치과 vs 내과 어디로 가나요",
        ],
        searchIntent: "informational",
      },
    ],
    topicAngles: [
      {
        template: "{year}년 {keyword}, 달라진 건강보험 혜택 총정리",
        subGroup: "스케일링",
        aspect: "",
      },
      {
        template: "{keyword} 초기 증상 {count}가지와 치료법",
        subGroup: "잇몸질환",
        aspect: "",
      },
      {
        template: "{keyword} 올바른 사용법: {aspect}",
        subGroup: "구강위생",
        aspect: "치과 의사가 알려주는 구강 관리 루틴",
      },
      {
        template: "{keyword} 원인별 해결법: {aspect}",
        subGroup: "구취",
        aspect: "치과에서 해결되는 입 냄새 vs 내과 문제",
      },
      {
        template: "치과 {keyword} 얼마나 자주 가야 할까? {aspect}",
        subGroup: "정기검진",
        aspect: "연령별 권장 방문 주기 가이드",
      },
      {
        template: "{keyword} vs 일반 스케일링: {aspect}",
        subGroup: "에어플로우",
        aspect: "차이점과 효과, 비용 비교 총정리",
      },
      {
        template: "{keyword} 최신 치료법: {aspect}",
        subGroup: "잇몸재생/치료",
        aspect: "잇몸재생주사부터 이식 수술까지 옵션 비교",
      },
      {
        template: "{keyword} 원인과 해결법: {aspect}",
        subGroup: "구강건조/타액",
        aspect: "약 부작용부터 생활습관까지 구강건조 완벽 가이드",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 건강상식 (health-tips)
  // ─────────────────────────────────────────────────────────
  {
    category: "health-tips",
    slug: "health-tips",
    subGroups: [
      {
        name: "구강건강",
        keywords: [
          "구강건강", "치아 건강", "구강 관리",
          "건강한 치아", "치아 수명", "구강 건강 관리",
          "치아 관리 팁", "구강 건강 비결",
          "치아 수명 늘리는 생활습관", "나이 들면 이가 약해지는 이유",
          "치과의사가 직접 하는 구강 관리법", "건강한 치아 오래 유지하는 비결",
          "구강건강과 전신건강 관계",
        ],
        searchIntent: "informational",
      },
      {
        name: "영양/음식",
        keywords: [
          "치아에 좋은 음식", "치아에 나쁜 음식", "칼슘 치아",
          "커피 치아", "탄산음료 치아", "치아 색 음식",
          "치아 건강 식품", "구강 건강 식단",
          "커피 마시면 치아 변색 예방법", "탄산음료 치아 부식 얼마나 심한가요",
          "치아에 좋은 음식 칼슘 말고 뭐가 있나요", "식초 레몬 산성 음식 치아 손상",
          "아이 치아에 좋은 간식 추천",
        ],
        searchIntent: "informational",
      },
      {
        name: "전신건강",
        keywords: [
          "당뇨와 치과", "구강 전신건강", "심장병 치과",
          "치주염 전신", "임신과 치과", "골다공증 치과",
          "전신질환 구강", "치과 건강 관계", "치주염 있으면 심장병 위험 높아지나요",
          "당뇨 환자 치과 치료 시 주의사항", "잇몸병이 치매에 영향 주나요", "구강 세균 폐렴 연관성",
          "전신 마취 수술 전 치과 검진 필요한가요"
        ],
        searchIntent: "informational",
      },
      {
        name: "임산부",
        keywords: [
          "임산부 치과", "임신 중 치과", "임신 치과 치료",
          "임산부 스케일링", "임신 충치", "임신 잇몸",
          "임신 구강관리", "임산부 마취", "임신 중 치과 마취 해도 되나요",
          "임신 몇개월에 치과 치료 가능한가요", "임산부 스케일링 태아에 영향 없나요", "임신 중 잇몸 출혈 심한데 정상인가요",
          "출산 후 치과 치료 언제부터 가능한가요"
        ],
        searchIntent: "informational",
      },
      {
        name: "시니어",
        keywords: [
          "노인 구강관리", "어르신 치과", "노인 치아",
          "노인 잇몸", "시니어 구강", "65세 치과",
          "노인 구강건강", "노년 치아 관리", "시니어 임플란트",
          "65세 치과 보험", "노인 잇몸 관리",
          "65세 치과 건강보험 혜택 총정리", "노인 임플란트 vs 틀니 뭐가 좋을까",
          "어르신 잇몸약 효과 있나요", "치매 환자 구강관리 방법",
        ],
        searchIntent: "informational",
      },
      {
        name: "치과공포/심리",
        keywords: [
          "치과 공포증", "수면 치료", "무통 치료",
          "치과 무서워요", "진정 치료", "웃음가스 치과",
          "치과 불안", "치과 두려움 극복",
          "치과 너무 무서운데 수면 치료 안전한가요", "웃음가스 부작용 있나요",
          "치과 공포증 극복하는 심리 방법", "마취 안 되면 어떡하나요",
          "치과 구역질 나는데 해결 방법",
        ],
        searchIntent: "informational",
      },
      {
        name: "약/부작용",
        keywords: [
          "치과 항생제", "치과 진통제", "혈압약 치과",
          "혈액희석제 발치", "골다공증약 임플란트", "아스피린 발치",
          "항응고제 치과", "비스포스포네이트 치과", "당뇨약 치과",
          "스테로이드 치과", "혈압약 먹는데 발치 가능한가요", "아스피린 끊고 며칠 후에 발치 가능",
          "골다공증약 턱뼈 괴사 위험 진짜인가요", "치과 항생제 며칠 먹어야 하나요", "발치 후 진통제 뭘 먹으면 좋나요"
        ],
        searchIntent: "informational",
      },
      {
        name: "구강케어제품",
        keywords: [
          "전동칫솔 추천", "치약 추천", "워터픽 효과",
          "구강세정제 추천", "치간칫솔 추천", "치실 추천",
          "잇몸 치약", "시린이 치약", "잇몸 치약 시린이 치약 비교",
          "전동칫솔 가격대별 추천 가성비", "구강세정제 매일 써도 괜찮나요", "교정 중 추천 칫솔 치간칫솔",
          "치과의사가 실제로 쓰는 치약 뭔가요"
        ],
        searchIntent: "commercial",
      },
    ],
    topicAngles: [
      {
        template: "{keyword} {count}가지 핵심 습관: {aspect}",
        subGroup: "구강건강",
        aspect: "치과 의사가 직접 실천하는 방법",
      },
      {
        template: "{keyword}: {aspect}",
        subGroup: "영양/음식",
        aspect: "먹어도 되는 것 vs 주의해야 할 것",
      },
      {
        template: "{keyword} 꼭 알아야 할 이유: {aspect}",
        subGroup: "전신건강",
        aspect: "구강 건강이 전신에 미치는 영향",
      },
      {
        template: "{keyword} 안전한 치과 치료 가이드: {aspect}",
        subGroup: "임산부",
        aspect: "시기별 가능한 치료와 주의사항",
      },
      {
        template: "{keyword} 구강관리 완벽 가이드: {aspect}",
        subGroup: "시니어",
        aspect: "임플란트부터 틀니까지 노년 치아 관리법",
      },
      {
        template: "{keyword} 극복 가이드: {aspect}",
        subGroup: "치과공포/심리",
        aspect: "수면·진정·무통 치료 옵션 완벽 비교",
      },
      {
        template: "{keyword} 치과 치료 시 주의사항: {aspect}",
        subGroup: "약/부작용",
        aspect: "복용 약별 치과 치료 전 체크리스트",
      },
      {
        template: "{year}년 {keyword} 가이드: {aspect}",
        subGroup: "구강케어제품",
        aspect: "치과 의사가 추천하는 구강 케어 제품 비교",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 치과선택 (dental-choice)
  // ─────────────────────────────────────────────────────────────
  {
    category: "dental-choice",
    slug: "dental-choice",
    subGroups: [
      {
        name: "지역검색",
        keywords: [
          "김포치과 추천", "김포 임플란트 잘하는 곳", "김포 치과 잘하는 곳",
          "김포 교정 치과", "고촌 치과",
          "한강신도시 치과", "장기동 치과", "김포 치과 추천",
          "한강신도시 임플란트", "장기동 임플란트", "고촌 치과 추천",
          "풍무동 치과", "김포시 치과 추천", "김포 한강신도시 치과",
          "김포 한강신도시 치과 추천 후기", "장기동 임플란트 잘하는 치과 고르는 법",
          "김포 소아치과 아이 안 무서워하는 곳", "고촌역 근처 치과 추천",
          "김포 신도시 야간 치과 있나요",
        ],
        searchIntent: "navigational",
      },
      {
        name: "신뢰/비교",
        keywords: [
          "치과 고르는 법", "치과 추천", "좋은 치과 특징",
          "동네치과 대학병원", "치과 선택 기준", "치과 의사 실력",
          "치과 비교", "치과 상담", "치과추천",
          "과잉진료", "세컨드오피니언 치과", "동네치과 vs 대학병원 어디로 가야 하나요",
          "치과 상담만 받아도 되나요 비용", "좋은 치과 고르는 기준 체크리스트", "치과마다 진단 다른 이유"
        ],
        searchIntent: "commercial",
      },
      {
        name: "긴급/증상",
        keywords: [
          "치통 응급", "이가 아플때", "이가 흔들려요",
          "잇몸 출혈", "치아 깨짐", "밤에 치통",
          "치아 빠짐", "잇몸 부음", "잇몸에서 피나요",
          "이가 시려요", "양치할때 피", "이 시림",
          "밤에 이가 아플때 응급 처치법", "치아 깨졌을때 당일 치료 가능한가요", "주말에 갑자기 이가 아프면 어디 가나요",
          "이 빠졌을때 골든타임 얼마나"
        ],
        searchIntent: "transactional",
      },
      {
        name: "비용/보험",
        keywords: [
          "치과 비용", "치과 건강보험", "치과 치료비",
          "치과 진료비", "치과 가격", "치과 비용 평균",
          "치과 보험 적용", "치과 실비", "치과 치료별 건강보험 적용 항목 총정리",
          "치과 진료비 영수증 보는 법", "치과 비급여 항목 뭐가 있나요", "치과 의료비 연말정산 공제 방법",
          "2026년 달라진 치과 건강보험 혜택"
        ],
        searchIntent: "commercial",
      },
      {
        name: "후기/평판",
        keywords: [
          "치과 후기", "치과 리뷰", "치과 평판",
          "치과 후기 보는 법", "치과 만족도", "치과 추천 후기",
          "치과 블로그 후기", "치과 경험",
          "치과 후기 진짜 vs 광고 구별하는 법", "네이버 치과 리뷰 믿어도 되나요",
          "치과 블로그 후기 체험단 구별법", "치과 별점 낮으면 안 좋은 건가요",
          "치과 후기 어디서 확인하나요",
        ],
        searchIntent: "commercial",
      },
      {
        name: "김포지역세분화",
        keywords: [
          "김포 치과", "김포 장기동 치과", "김포 풍무동 치과",
          "김포 고촌 치과", "김포 구래동 치과", "김포 마산동 치과",
          "김포 양촌 치과", "김포 걸포동 치과",
          "김포 장기동 치과 진료 잘하는 곳", "김포 풍무동 근처 소아치과",
          "김포 구래동 임플란트 치과", "김포 고촌 주말 진료 치과",
          "한강신도시 아파트 근처 치과 추천",
        ],
        searchIntent: "navigational",
      },
      {
        name: "김포진료별",
        keywords: [
          "김포 임플란트", "김포 교정", "김포 스케일링",
          "김포 충치치료", "김포 신경치료", "김포 미백",
          "김포 틀니", "김포 소아치과",
          "김포 임플란트 잘하는 치과 추천 기준", "김포 교정 전문 치과 상담 비용",
          "김포 에어플로우 스케일링 하는 곳", "김포 소아치과 진정치료 되는 곳",
          "김포 미백 치과 가격 비교",
        ],
        searchIntent: "navigational",
      },
      {
        name: "양심/신뢰",
        keywords: [
          "양심치과", "과잉진료 치과", "치과 세컨드오피니언",
          "치과 과잉진료 구별", "양심 치과 고르는 법", "치과 신뢰",
          "투명 치과", "치과 진단 차이",
          "치과 과잉진료 구별하는 방법", "치과에서 불필요한 치료 권유받았을 때",
          "양심치과 찾는 현실적인 방법", "치과 진단서 다른데서 확인해도 되나요",
          "치과 치료 계획 의심될 때 대처법",
        ],
        searchIntent: "commercial",
      },
      {
        name: "야간/주말/편의",
        keywords: [
          "김포 야간치과", "김포 주말치과", "응급 치과",
          "야간 치과 진료", "주말 치과 진료", "공휴일 치과",
          "김포 일요일 치과", "김포 늦게까지 치과",
          "김포 야간 치과 몇시까지 하나요", "일요일 치과 응급 진료 가능한 곳",
          "공휴일 치통 응급실 가야 하나요", "김포 토요일 오후 치과 진료",
          "평일 늦게까지 하는 김포 치과",
        ],
        searchIntent: "transactional",
      },
      {
        name: "보험/실비활용",
        keywords: [
          "치과 실비보험", "임플란트 실비", "치과 실비 청구",
          "치과 보험 적용 항목", "치과 실비 보장", "교정 실비",
          "크라운 실비", "치과 의료비 공제",
          "임플란트 실비보험 청구 방법 서류", "치과 실비 보장 범위 어디까지",
          "크라운 실비보험 되나요 비급여인데", "교정 치료 실비 청구 가능한 경우",
          "치과 의료비 연말정산 세액공제 한도",
        ],
        searchIntent: "commercial",
      },
      {
        name: "브랜드검색",
        keywords: [
          "서울본치과", "본치과", "서울본치과 김포",
          "김포 본치과", "장기동 본치과", "한강신도시 본치과",
          "born2smile", "본투스마일", "서울본치과 진료시간 토요일",
          "김포 서울본치과 임플란트 후기", "서울본치과 위치 주차 가능한가요", "한강신도시 서울본치과 진료과목",
          "서울본치과 예약 방법 전화번호"
        ],
        searchIntent: "navigational",
      },
    ],
    topicAngles: [
      {
        template: "{year}년 {keyword} 완벽 가이드: {aspect}",
        subGroup: "지역검색",
        aspect: "진료 과목별 추천 치과 고르는 법",
      },
      {
        template: "{keyword} {count}가지 핵심 기준: {aspect}",
        subGroup: "신뢰/비교",
        aspect: "치과 의사가 알려주는 좋은 치과의 조건",
      },
      {
        template: "{keyword} 대처법: {aspect}",
        subGroup: "긴급/증상",
        aspect: "치과 가기 전 응급 처치와 방문 타이밍",
      },
      {
        template: "{year}년 {keyword} 총정리: {aspect}",
        subGroup: "비용/보험",
        aspect: "건강보험 적용 범위부터 실제 부담 비용까지",
      },
      {
        template: "{keyword} 제대로 보는 법: {aspect}",
        subGroup: "후기/평판",
        aspect: "신뢰할 수 있는 치과 후기 구별 가이드",
      },
      {
        template: "{keyword} 추천 가이드: {aspect}",
        subGroup: "김포지역세분화",
        aspect: "동네별 위치·특징·진료 과목 비교",
      },
      {
        template: "{keyword} 잘하는 곳 고르는 법: {aspect}",
        subGroup: "김포진료별",
        aspect: "진료별 전문성 확인 포인트",
      },
      {
        template: "{keyword} 구별하는 {count}가지 방법: {aspect}",
        subGroup: "양심/신뢰",
        aspect: "과잉진료 피하고 신뢰할 수 있는 치과 찾기",
      },
      {
        template: "{keyword} 찾기: {aspect}",
        subGroup: "야간/주말/편의",
        aspect: "김포 지역 야간·주말·응급 진료 안내",
      },
      {
        template: "{keyword} 활용 가이드: {aspect}",
        subGroup: "보험/실비활용",
        aspect: "치료별 실비 청구 방법과 보장 범위",
      },
      {
        template: "{keyword} 진료 안내: {aspect}",
        subGroup: "브랜드검색",
        aspect: "김포 한강신도시 서울본치과 진료 과목과 특징",
      },
    ],
  },
];

// =============================================================
// 연관 키워드 필터링 — 비치과 동음이의어 & 타 지역 키워드 제외
// =============================================================

/** 비치과 산업 용어 (명확한 비치과 키워드 즉시 차단) */
const NON_DENTAL_PATTERN =
  /방수|우레탄|방화|실리콘|코킹|건축|타일|방습|접착|페인트|도장|배관|창호|외벽|지붕|바닥재|에폭시|폴리|몰탈|줄눈|커튼월|욕실|창틀|레진아트|레진공예|레진테이블|피부스케일링|피부 스케일링/;

/** 동음이의어 — "실란트", "레진" 등 치과 외 산업에서도 쓰이는 단어 */
const AMBIGUOUS_BASE_PATTERN = /실란트|레진/;

/** 동음이의어 키워드에서 치과 맥락을 판별하는 패턴 */
const DENTAL_CONTEXT_PATTERN =
  /치과|치아|충치|불소|어린이|소아|아이|유치|영구치|예방|도포|치료|효과|비용|가격|보험|후기|잇몸|구강|스케일링|신경|크라운|인레이|보존|보철|심미|앞니|수명|변색|관리|홈메우기/;

/** 김포 외 주요 지역명 (타 지역 치과 키워드 차단) */
const NON_LOCAL_REGION_PATTERN =
  /강남|서초|송파|강동|마포|용산|종로|강서|양천|영등포|구로|관악|동작|서대문|은평|성북|동대문|중랑|노원|도봉|강북|광진|성동|수원|성남|분당|용인|화성|평택|안양|안산|시흥|광명|군포|의왕|과천|하남|이천|여주|양평|가평|포천|동두천|연천|양주|의정부|구리|남양주|고양|파주|부천|오산|안성|인천|청라|부평|대구|부산|서면|해운대|동래|대전|둔산|유성|광주|울산|세종|서울|고덕|제주|천안|청주|전주|춘천|원주|강릉|속초|여수|순천|포항|경주|창원|진주|김해|양산|목포|군산|익산|당진|서산|아산|홍성/;

/** 김포 지역 허용 패턴 (이 패턴에 매칭되면 지역 필터 통과) */
const LOCAL_AREA_PATTERN =
  /김포|고촌|한강신도시|한강센트럴자이|서울본치과|일산|검단|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동/;

/**
 * 검색광고 API 연관 키워드가 치과·지역 관련성을 충족하는지 확인.
 * overview/route.ts에서 연관 키워드를 서브그룹에 배정하기 전에 호출.
 */
export function isRelevantRelatedKeyword(keyword: string): boolean {
  // 1) 명확한 비치과 산업 용어 차단
  if (NON_DENTAL_PATTERN.test(keyword)) return false;

  // 2) 동음이의어(실란트·레진): 치과 맥락이 없으면 차단
  if (AMBIGUOUS_BASE_PATTERN.test(keyword) && !DENTAL_CONTEXT_PATTERN.test(keyword)) return false;

  // 3) 김포 지역 키워드는 항상 허용
  if (LOCAL_AREA_PATTERN.test(keyword)) return true;

  // 4) 타 지역명이 포함된 키워드 차단
  if (NON_LOCAL_REGION_PATTERN.test(keyword)) return false;

  return true;
}

// =============================================================
// 런타임 검증 — subGroups.length <= 15 (브릿지 배칭 지원)
// =============================================================

export function validateCategoryKeywords(): void {
  for (const cat of CATEGORY_KEYWORDS) {
    const categoryLabel = getKeywordCategoryLabel(cat.category);
    if (cat.subGroups.length > 15) {
      throw new Error(
        `[admin-naver-datalab-keywords] "${categoryLabel}" 카테고리의 서브그룹이 ${cat.subGroups.length}개입니다. ` +
          "브릿지 배칭은 최대 15개 서브그룹까지 지원합니다.",
      );
    }
    for (const sg of cat.subGroups) {
      if (sg.keywords.length > 20) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${categoryLabel}" > "${sg.name}" 서브그룹의 키워드가 ${sg.keywords.length}개입니다. ` +
            "네이버 DataLab API는 그룹당 최대 20개 키워드만 허용합니다.",
        );
      }
      if (sg.keywords.length < 2) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${categoryLabel}" > "${sg.name}" 서브그룹의 키워드가 ${sg.keywords.length}개입니다. ` +
            "검색량 조회를 위해 최소 2개가 필요합니다.",
        );
      }
    }
    // TopicAngle 커버리지 검증: 모든 서브그룹에 대응하는 TopicAngle이 있어야 함
    for (const sg of cat.subGroups) {
      const hasAngle = cat.topicAngles.some((ta) => ta.subGroup === sg.name);
      if (!hasAngle) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${categoryLabel}" > "${sg.name}" 서브그룹에 topicAngle이 없습니다.`,
        );
      }
    }
  }
}

// 모듈 로드 시 즉시 검증
validateCategoryKeywords();
