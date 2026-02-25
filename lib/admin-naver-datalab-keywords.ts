// =============================================================
// 네이버 DataLab 키워드 택소노미
// 8개 카테고리 × 최대 15개 서브그룹 (브릿지 배칭으로 5개 제한 해제)
// =============================================================

import type { BlogCategoryValue } from "./blog/types";

export interface KeywordSubGroup {
  name: string;             // 서브그룹명 (예: "비용/가격")
  keywords: string[];       // 최대 20개 키워드 (네이버 DataLab API 그룹당 최대 20개)
  volumeKeywords: string[]; // 검색광고 API 검색량 조회용 (2-3개, 대표성 높은 키워드)
}

export interface TopicAngle {
  template: string;  // 제목 템플릿 (예: "{year}년 {keyword} 총정리: {aspect}")
  subGroup: string;  // 연결된 서브그룹명 (KeywordSubGroup.name과 일치)
  aspect: string;    // 절사 앵글 (예: "건강보험 적용부터 종류별 가격 비교까지")
}

export interface CategoryKeywords {
  category: BlogCategoryValue; // 한국어 카테고리명
  slug: string;                // 영어 URL 슬러그 (CATEGORY_SLUG_MAP과 동일)
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
    category: "임플란트",
    slug: "implant",
    subGroups: [
      {
        name: "비용/가격",
        keywords: [
          "임플란트 비용",
          "임플란트 가격",
          "임플란트 보험",
          "임플란트 건강보험",
          "임플란트 얼마",
          "임플란트 평균 비용",
          "임플란트 본인부담금",
          "노인 임플란트 비용",
        ],
        volumeKeywords: ["임플란트 비용", "임플란트 가격"],
      },
      {
        name: "과정/기간",
        keywords: [
          "임플란트 과정",
          "임플란트 기간",
          "임플란트 수술",
          "뼈이식",
          "임플란트 식립",
          "임플란트 치유기간",
          "뼈이식 임플란트",
          "임플란트 완성까지",
        ],
        volumeKeywords: ["임플란트 과정", "임플란트 기간"],
      },
      {
        name: "부작용/관리",
        keywords: [
          "임플란트 부작용",
          "임플란트 통증",
          "임플란트 실패",
          "임플란트 관리",
          "임플란트 수명",
          "임플란트 후기",
          "임플란트 염증",
          "임플란트 주의사항",
        ],
        volumeKeywords: ["임플란트 부작용", "임플란트 관리"],
      },
      {
        name: "종류/브랜드",
        keywords: [
          "임플란트 종류",
          "오스템 임플란트",
          "스트라우만 임플란트",
          "임플란트 브랜드 비교",
          "국산 임플란트",
          "수입 임플란트",
          "임플란트 추천",
          "디지털 임플란트",
          "네비게이션 임플란트",
          "원데이 임플란트",
          "전치부 임플란트",
        ],
        volumeKeywords: ["임플란트 종류", "오스템 임플란트"],
      },
      {
        name: "대상/조건",
        keywords: [
          "당뇨 임플란트",
          "고혈압 임플란트",
          "노인 임플란트",
          "임플란트 나이",
          "임플란트 조건",
          "잇몸 임플란트",
          "뼈 없는 임플란트",
          "임플란트 가능 여부",
        ],
        volumeKeywords: ["당뇨 임플란트", "임플란트 조건"],
      },
      {
        name: "첨단/디지털",
        keywords: [
          "원데이 임플란트", "네비게이션 임플란트", "즉시 임플란트",
          "디지털 임플란트", "3D 임플란트", "무절개 임플란트",
          "가이드 임플란트", "즉시 식립",
        ],
        volumeKeywords: ["원데이 임플란트", "즉시 임플란트"],
      },
      {
        name: "임플란트 잇몸",
        keywords: [
          "잇몸재생주사", "임플란트 주위염", "잇몸 이식",
          "임플란트 잇몸 관리", "임플란트 잇몸 염증", "임플란트 잇몸 통증",
          "임플란트 잇몸 퇴축", "임플란트 점막염",
        ],
        volumeKeywords: ["임플란트 주위염", "잇몸재생주사"],
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
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 치아교정 (orthodontics)
  // ─────────────────────────────────────────────────────────
  {
    category: "치아교정",
    slug: "orthodontics",
    subGroups: [
      {
        name: "종류/방법",
        keywords: [
          "투명교정",
          "인비절라인",
          "세라믹 교정",
          "금속 교정",
          "설측 교정",
          "부분 교정",
          "교정 방법",
          "치아교정 종류",
        ],
        volumeKeywords: ["투명교정", "치아교정 종류"],
      },
      {
        name: "비용/기간",
        keywords: [
          "치아교정 비용",
          "교정 가격",
          "투명교정 비용",
          "교정 기간",
          "치아교정 기간",
          "성인 교정 비용",
          "교정 얼마",
          "교정 치료 기간",
        ],
        volumeKeywords: ["치아교정 비용", "교정 기간"],
      },
      {
        name: "부작용/관리",
        keywords: [
          "교정 통증",
          "교정 부작용",
          "교정 후 관리",
          "교정 주의사항",
          "교정 중 음식",
          "교정기 관리",
          "교정 후 후퇴",
          "유지장치",
        ],
        volumeKeywords: ["교정 통증", "교정 부작용"],
      },
      {
        name: "대상/나이",
        keywords: [
          "성인 교정",
          "소아 교정",
          "청소년 교정",
          "교정 나이",
          "교정 시작 나이",
          "30대 교정",
          "40대 교정",
          "교정 적합 나이",
        ],
        volumeKeywords: ["성인 교정", "교정 나이"],
      },
      {
        name: "생활/관리",
        keywords: [
          "교정 식사",
          "교정 칫솔질",
          "교정 중 관리",
          "교정 구강위생",
          "교정 칫솔",
          "교정 치간칫솔",
          "교정 후 유지",
          "교정 리테이너",
        ],
        volumeKeywords: ["교정 칫솔질", "교정 중 관리"],
      },
      {
        name: "심미/고민",
        keywords: [
          "돌출입 교정", "덧니 교정", "교정 전후",
          "벌어진 앞니 교정", "주걱턱 교정", "무턱 교정",
          "비대칭 교정", "교정 얼굴 변화",
        ],
        volumeKeywords: ["돌출입 교정", "덧니 교정"],
      },
      {
        name: "교정비교/선택",
        keywords: [
          "인비절라인 가격", "투명교정 후기", "교정 추천",
          "교정 병원 추천", "투명교정 비교", "인비절라인 후기",
          "교정 잘하는 치과", "교정 상담",
        ],
        volumeKeywords: ["인비절라인 가격", "투명교정 후기"],
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
    category: "보철치료",
    slug: "prosthetics",
    subGroups: [
      {
        name: "크라운/브릿지",
        keywords: [
          "크라운",
          "치아 크라운",
          "브릿지",
          "치아 브릿지",
          "크라운 수명",
          "크라운 비용",
          "브릿지 비용",
          "치관 보철",
        ],
        volumeKeywords: ["치아 크라운", "브릿지"],
      },
      {
        name: "틀니",
        keywords: [
          "틀니",
          "부분틀니",
          "완전틀니",
          "임플란트 틀니",
          "틀니 비용",
          "틀니 관리",
          "틀니 종류",
          "틀니 적응",
        ],
        volumeKeywords: ["틀니", "틀니 비용"],
      },
      {
        name: "라미네이트",
        keywords: [
          "라미네이트",
          "라미네이트 비용",
          "라미네이트 수명",
          "앞니 라미네이트",
          "라미네이트 후기",
          "라미네이트 부작용",
          "치아 성형",
          "심미 보철",
        ],
        volumeKeywords: ["라미네이트", "라미네이트 비용"],
      },
      {
        name: "치아미백",
        keywords: [
          "치아 미백",
          "치아미백 비용",
          "자가미백",
          "전문미백",
          "치아미백 효과",
          "치아미백 부작용",
          "미백 치약",
          "치아 변색",
        ],
        volumeKeywords: ["치아 미백", "치아미백 비용"],
      },
      {
        name: "비용",
        keywords: [
          "보철 비용",
          "치아 보철 가격",
          "크라운 가격",
          "보철 치료 비용",
          "치과 보철 얼마",
          "보험 적용 보철",
          "보철 건강보험",
          "보철 본인부담",
        ],
        volumeKeywords: ["보철 비용", "크라운 가격"],
      },
      {
        name: "소재/종류",
        keywords: [
          "지르코니아",
          "PFM 크라운",
          "올세라믹",
          "골드 크라운",
          "금 크라운",
          "보철 소재",
          "지르코니아 크라운",
          "세라믹 크라운",
        ],
        volumeKeywords: ["지르코니아", "골드 크라운"],
      },
      {
        name: "앞니치료",
        keywords: [
          "앞니 크라운", "앞니 깨짐", "앞니 레진",
          "앞니 보철", "앞니 임플란트", "앞니 치료 비용",
          "앞니 브릿지", "앞니 성형",
        ],
        volumeKeywords: ["앞니 크라운", "앞니 깨짐"],
      },
    ],
    topicAngles: [
      {
        template: "{keyword} vs 임플란트: {aspect}",
        subGroup: "크라운/브릿지",
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
    category: "보존치료",
    slug: "restorative",
    subGroups: [
      {
        name: "충치치료",
        keywords: [
          "충치치료",
          "충치 초기",
          "충치 증상",
          "충치 방치",
          "충치 비용",
          "충치 치료 과정",
          "2차 충치",
          "충치 예방",
        ],
        volumeKeywords: ["충치치료", "충치 비용"],
      },
      {
        name: "신경치료",
        keywords: [
          "신경치료",
          "신경치료 과정",
          "신경치료 통증",
          "신경치료 비용",
          "신경치료 기간",
          "신경치료 후 크라운",
          "치수염",
          "신경치료 후 관리",
        ],
        volumeKeywords: ["신경치료", "신경치료 비용"],
      },
      {
        name: "레진/인레이",
        keywords: [
          "레진",
          "레진 치료",
          "인레이",
          "온레이",
          "레진 비용",
          "인레이 비용",
          "레진 수명",
          "레진 변색",
        ],
        volumeKeywords: ["레진 치료", "인레이 비용"],
      },
      {
        name: "통증/관리",
        keywords: [
          "이갈이",
          "턱관절",
          "치아 시림",
          "차가운 음식 통증",
          "단 음식 통증",
          "치아 균열",
          "크랙 치아",
          "지각과민",
          "이 시림 치료",
          "이갈이 마우스피스",
          "턱관절 치료",
          "이 시림 치약",
        ],
        volumeKeywords: ["이갈이", "치아 시림"],
      },
      {
        name: "예방",
        keywords: [
          "충치 예방",
          "치아 관리",
          "치아 건강",
          "불소 치약",
          "치실",
          "전동칫솔",
          "치아 마모",
          "에나멜 보호",
        ],
        volumeKeywords: ["충치 예방", "치아 관리"],
      },
      {
        name: "증상/자가진단",
        keywords: [
          "이가 시려요", "잇몸에서 피나요", "이가 아파요",
          "이가 흔들려요", "이 색이 변했어요", "이가 깨졌어요",
          "잇몸이 부었어요", "이가 욱신거려요",
        ],
        volumeKeywords: ["이가 시려요", "잇몸에서 피나요"],
      },
      {
        name: "사랑니/발치",
        keywords: [
          "사랑니 발치", "사랑니 통증", "매복 사랑니",
          "사랑니 발치 비용", "사랑니 발치 후 관리", "사랑니 부분 매복",
          "사랑니 염증", "사랑니 발치 기간",
        ],
        volumeKeywords: ["사랑니 발치", "사랑니 통증"],
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
        template: "{keyword} vs {aspect}",
        subGroup: "레진/인레이",
        aspect: "인레이, 내 치아엔 어떤 게 맞을까?",
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
        subGroup: "사랑니/발치",
        aspect: "비용·통증·회복기간, 발치 전 꼭 알아야 할 것들",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 소아치료 (pediatric)
  // ─────────────────────────────────────────────────────────
  {
    category: "소아치료",
    slug: "pediatric",
    subGroups: [
      {
        name: "소아진료",
        keywords: [
          "소아치과",
          "어린이 치과",
          "아이 치과",
          "소아 치과 공포",
          "소아 치과 진정치료",
          "어린이 충치",
          "소아 충치 치료",
          "어린이 치과 비용",
        ],
        volumeKeywords: ["소아치과", "어린이 충치"],
      },
      {
        name: "유치관리",
        keywords: [
          "유치",
          "유치 충치",
          "유치 빠지는 시기",
          "유치 관리",
          "유치 뽑는 시기",
          "유치 영구치",
          "유치 보존",
          "유치 치료 필요성",
        ],
        volumeKeywords: ["유치 충치", "유치 관리"],
      },
      {
        name: "교정시기",
        keywords: [
          "소아 교정",
          "어린이 교정",
          "교정 시작 나이",
          "조기 교정",
          "초등학생 교정",
          "어린이 교정 시기",
          "혼합치열 교정",
          "성장기 교정",
        ],
        volumeKeywords: ["소아 교정", "교정 시작 나이"],
      },
      {
        name: "습관/예방",
        keywords: [
          "손가락 빨기",
          "구강 호흡",
          "이갈기 아이",
          "아이 치아 관리",
          "어린이 칫솔질",
          "젖병 충치",
          "아이 구강 습관",
          "치아 발육",
        ],
        volumeKeywords: ["손가락 빨기", "어린이 칫솔질"],
      },
      {
        name: "불소도포",
        keywords: [
          "불소 도포",
          "어린이 불소",
          "불소 효과",
          "불소 안전성",
          "불소 바니쉬",
          "불소 도포 비용",
          "불소 도포 주기",
          "불소 치약 어린이",
        ],
        volumeKeywords: ["불소 도포", "어린이 불소"],
      },
      {
        name: "홈메우기",
        keywords: [
          "홈메우기",
          "실란트",
          "치면 열구 전색",
          "홈메우기 비용",
          "홈메우기 효과",
          "어린이 홈메우기",
          "홈메우기 보험",
          "실란트 비용",
        ],
        volumeKeywords: ["홈메우기", "실란트 비용"],
      },
      {
        name: "소아응급/외상",
        keywords: [
          "아이 이 부러짐", "아이 이 빠졌을때", "유치 외상",
          "아이 치아 부딪힘", "유치 탈구", "어린이 치아 응급",
          "아이 입 부딪힘", "유치 깨짐",
        ],
        volumeKeywords: ["아이 이 부러짐", "유치 외상"],
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
    category: "예방관리",
    slug: "prevention",
    subGroups: [
      {
        name: "스케일링",
        keywords: [
          "스케일링",
          "스케일링 비용",
          "스케일링 보험",
          "스케일링 주기",
          "스케일링 효과",
          "스케일링 후기",
          "스케일링 통증",
          "치석 제거",
        ],
        volumeKeywords: ["스케일링", "스케일링 비용"],
      },
      {
        name: "잇몸질환",
        keywords: [
          "잇몸질환",
          "치주염",
          "치은염",
          "잇몸 치료",
          "치주 치료",
          "잇몸 붓기",
          "잇몸 출혈",
          "잇몸 내려앉음",
          "잇몸 퇴축",
          "치조골 흡수",
          "잇몸약",
          "잇몸 영양제",
        ],
        volumeKeywords: ["잇몸질환", "치주염"],
      },
      {
        name: "구강위생",
        keywords: [
          "치실 사용법",
          "치간칫솔",
          "워터픽",
          "전동칫솔",
          "올바른 칫솔질",
          "구강 세정기",
          "치아 관리 방법",
          "구강 관리 루틴",
        ],
        volumeKeywords: ["치실 사용법", "전동칫솔"],
      },
      {
        name: "구취",
        keywords: [
          "구취",
          "입 냄새",
          "입냄새 원인",
          "구취 치료",
          "입냄새 제거",
          "혀 세정",
          "구취 예방",
          "아침 입냄새",
        ],
        volumeKeywords: ["구취", "입냄새 원인"],
      },
      {
        name: "정기검진",
        keywords: [
          "치과 정기검진",
          "치과 검진 주기",
          "치과 X선",
          "치과 정기 방문",
          "치아 검사",
          "구강 검진",
          "치과 예방",
          "정기 스케일링",
        ],
        volumeKeywords: ["치과 정기검진", "치과 검진 주기"],
      },
      {
        name: "에어플로우",
        keywords: [
          "에어플로우",
          "에어플로우 스케일링",
          "에어플로우 비용",
          "에어플로우 효과",
          "에어플로우 후기",
          "에어플로우 통증",
          "파우더 스케일링",
          "에어플로우 치석",
        ],
        volumeKeywords: ["에어플로우", "에어플로우 스케일링"],
      },
      {
        name: "잇몸재생/치료",
        keywords: [
          "잇몸재생주사", "잇몸재생술", "잇몸 퇴축 치료",
          "잇몸 이식 수술", "치조골 재생", "잇몸 재건",
          "잇몸재생 비용", "잇몸 퇴축 원인",
        ],
        volumeKeywords: ["잇몸재생주사", "잇몸재생술"],
      },
      {
        name: "구강건조/타액",
        keywords: [
          "구강건조증", "입 마름", "약 부작용 입마름",
          "타액 분비 감소", "구강건조 치료", "입 마름 원인",
          "구강건조 예방", "침 분비 촉진",
        ],
        volumeKeywords: ["구강건조증", "입 마름"],
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
    category: "건강상식",
    slug: "health-tips",
    subGroups: [
      {
        name: "구강건강",
        keywords: [
          "구강건강",
          "치아 건강",
          "구강 관리",
          "건강한 치아",
          "치아 수명",
          "구강 건강 관리",
          "치아 관리 팁",
          "구강 건강 비결",
        ],
        volumeKeywords: ["구강건강", "치아 건강"],
      },
      {
        name: "영양/음식",
        keywords: [
          "치아에 좋은 음식",
          "치아에 나쁜 음식",
          "칼슘 치아",
          "커피 치아",
          "탄산음료 치아",
          "치아 색 음식",
          "치아 건강 식품",
          "구강 건강 식단",
        ],
        volumeKeywords: ["치아에 좋은 음식", "치아에 나쁜 음식"],
      },
      {
        name: "전신건강",
        keywords: [
          "당뇨와 치과",
          "심장병 치과",
          "구강 전신건강",
          "치주염 전신",
          "임신과 치과",
          "골다공증 치과",
          "전신질환 구강",
          "치과 건강 관계",
        ],
        volumeKeywords: ["당뇨와 치과", "구강 전신건강"],
      },
      {
        name: "임산부",
        keywords: [
          "임산부 치과",
          "임신 치과 치료",
          "임신 중 치과",
          "임산부 스케일링",
          "임신 충치",
          "임신 잇몸",
          "임신 구강관리",
          "임산부 마취",
        ],
        volumeKeywords: ["임산부 치과", "임신 중 치과"],
      },
      {
        name: "시니어",
        keywords: [
          "노인 구강관리",
          "어르신 치과",
          "노인 치아",
          "노인 잇몸",
          "시니어 구강",
          "65세 치과",
          "노인 구강건강",
          "노년 치아 관리",
          "시니어 임플란트",
          "65세 치과 보험",
          "노인 잇몸 관리",
        ],
        volumeKeywords: ["노인 구강관리", "어르신 치과"],
      },
      {
        name: "치과공포/심리",
        keywords: [
          "치과 공포증", "수면 치료", "무통 치료",
          "치과 무서워요", "진정 치료", "웃음가스 치과",
          "치과 불안", "치과 두려움 극복",
        ],
        volumeKeywords: ["치과 공포증", "수면 치료"],
      },
      {
        name: "약/부작용",
        keywords: [
          "혈압약 치과", "혈액희석제 발치", "골다공증약 임플란트",
          "아스피린 발치", "항응고제 치과", "비스포스포네이트 치과",
          "당뇨약 치과", "스테로이드 치과",
        ],
        volumeKeywords: ["혈압약 치과", "혈액희석제 발치"],
      },
      {
        name: "구강케어제품",
        keywords: [
          "전동칫솔 추천", "워터픽 효과", "치약 추천",
          "구강세정제 추천", "치간칫솔 추천", "치실 추천",
          "잇몸 치약", "시린이 치약",
        ],
        volumeKeywords: ["전동칫솔 추천", "치약 추천"],
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
    category: "치과선택" as BlogCategoryValue,
    slug: "dental-choice",
    subGroups: [
      {
        name: "지역검색",
        keywords: [
          "김포치과 추천",
          "김포 임플란트 잘하는 곳",
          "김포 치과 잘하는 곳",
          "김포 교정 치과",
          "김포 소아치과",
          "고촌 치과",
          "한강신도시 치과",
          "장기동 치과",
          "김포 치과 추천",
          "한강신도시 임플란트",
          "장기동 임플란트",
          "고촌 치과 추천",
          "풍무동 치과",
          "김포시 치과 추천",
          "김포 한강신도시 치과",
        ],
        volumeKeywords: ["김포치과 추천", "김포 임플란트"],
      },
      {
        name: "신뢰/비교",
        keywords: [
          "치과 고르는 법",
          "좋은 치과 특징",
          "동네치과 대학병원",
          "치과 선택 기준",
          "치과 의사 실력",
          "치과 추천",
          "치과 비교",
          "치과 상담",
          "치과추천",
          "양심치과",
          "과잉진료",
          "세컨드오피니언 치과",
        ],
        volumeKeywords: ["치과 고르는 법", "치과 추천"],
      },
      {
        name: "긴급/증상",
        keywords: [
          "이가 흔들려요",
          "잇몸 출혈",
          "치아 깨짐",
          "치통 응급",
          "이가 아플때",
          "밤에 치통",
          "치아 빠짐",
          "잇몸 부음",
          "잇몸에서 피나요",
          "이가 시려요",
          "양치할때 피",
          "이 시림",
        ],
        volumeKeywords: ["치통 응급", "이가 아플때"],
      },
      {
        name: "비용/보험",
        keywords: [
          "치과 비용",
          "치과 치료비",
          "치과 건강보험",
          "치과 진료비",
          "치과 가격",
          "치과 비용 평균",
          "치과 보험 적용",
          "치과 실비",
        ],
        volumeKeywords: ["치과 비용", "치과 건강보험"],
      },
      {
        name: "후기/평판",
        keywords: [
          "치과 후기",
          "치과 리뷰",
          "치과 평판",
          "치과 후기 보는 법",
          "치과 만족도",
          "치과 추천 후기",
          "치과 블로그 후기",
          "치과 경험",
        ],
        volumeKeywords: ["치과 후기", "치과 리뷰"],
      },
      {
        name: "김포지역세분화",
        keywords: [
          "김포 치과", "김포 장기동 치과", "김포 풍무동 치과",
          "김포 고촌 치과", "김포 구래동 치과", "김포 마산동 치과",
          "김포 양촌 치과", "김포 걸포동 치과",
        ],
        volumeKeywords: ["김포 치과", "김포 장기동 치과"],
      },
      {
        name: "김포진료별",
        keywords: [
          "김포 임플란트", "김포 교정", "김포 스케일링",
          "김포 충치치료", "김포 신경치료", "김포 미백",
          "김포 틀니", "김포 소아치과",
        ],
        volumeKeywords: ["김포 임플란트", "김포 교정"],
      },
      {
        name: "양심/신뢰",
        keywords: [
          "양심치과", "과잉진료 치과", "치과 세컨드오피니언",
          "치과 과잉진료 구별", "양심 치과 고르는 법", "치과 신뢰",
          "투명 치과", "치과 진단 차이",
        ],
        volumeKeywords: ["양심치과", "과잉진료 치과"],
      },
      {
        name: "야간/주말/편의",
        keywords: [
          "김포 야간치과", "김포 주말치과", "응급 치과",
          "야간 치과 진료", "주말 치과 진료", "공휴일 치과",
          "김포 일요일 치과", "김포 늦게까지 치과",
        ],
        volumeKeywords: ["김포 야간치과", "김포 주말치과"],
      },
      {
        name: "보험/실비활용",
        keywords: [
          "치과 실비보험", "임플란트 실비", "치과 실비 청구",
          "치과 보험 적용 항목", "치과 실비 보장", "교정 실비",
          "크라운 실비", "치과 의료비 공제",
        ],
        volumeKeywords: ["치과 실비보험", "임플란트 실비"],
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
    ],
  },
];

// =============================================================
// 연관 키워드 필터링 — 비치과 동음이의어 & 타 지역 키워드 제외
// =============================================================

/** 비치과 산업 용어 (명확한 비치과 키워드 즉시 차단) */
const NON_DENTAL_PATTERN =
  /방수|우레탄|방화|실리콘|코킹|건축|타일|방습|접착|페인트|도장|배관|창호|외벽|지붕|바닥재|에폭시|폴리|몰탈|줄눈|커튼월|욕실|창틀|레진아트|레진공예|레진테이블/;

/** 동음이의어 — "실란트", "레진" 등 치과 외 산업에서도 쓰이는 단어 */
const AMBIGUOUS_BASE_PATTERN = /실란트|레진/;

/** 동음이의어 키워드에서 치과 맥락을 판별하는 패턴 */
const DENTAL_CONTEXT_PATTERN =
  /치과|치아|충치|불소|어린이|소아|아이|유치|영구치|예방|도포|치료|효과|비용|가격|보험|후기|잇몸|구강|스케일링|신경|크라운|인레이|보존|보철|심미|앞니|수명|변색|관리|홈메우기/;

/** 김포 외 주요 지역명 (타 지역 치과 키워드 차단) */
const NON_LOCAL_REGION_PATTERN =
  /강남|서초|송파|강동|마포|용산|종로|강서|양천|영등포|구로|관악|동작|서대문|은평|성북|동대문|중랑|노원|도봉|강북|광진|성동|수원|성남|분당|용인|화성|평택|안양|안산|시흥|광명|군포|의왕|과천|하남|이천|여주|양평|가평|포천|동두천|연천|양주|의정부|구리|남양주|고양|파주|부천|오산|안성|인천|청라|대구|부산|울산|세종|제주|천안|전주|춘천|원주|강릉|속초|여수|순천|포항|경주|창원|진주|목포|군산|익산|당진|서산|아산|홍성/;

/** 김포 지역 허용 패턴 (이 패턴에 매칭되면 지역 필터 통과) */
const LOCAL_AREA_PATTERN =
  /김포|고촌|한강신도시|한강센트럴자이|일산|검단|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동/;

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
    if (cat.subGroups.length > 15) {
      throw new Error(
        `[admin-naver-datalab-keywords] "${cat.category}" 카테고리의 서브그룹이 ${cat.subGroups.length}개입니다. ` +
          "브릿지 배칭은 최대 15개 서브그룹까지 지원합니다.",
      );
    }
    for (const sg of cat.subGroups) {
      if (sg.keywords.length > 20) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${cat.category}" > "${sg.name}" 서브그룹의 키워드가 ${sg.keywords.length}개입니다. ` +
            "네이버 DataLab API는 그룹당 최대 20개 키워드만 허용합니다.",
        );
      }
      if (sg.volumeKeywords.length === 0 || sg.volumeKeywords.length > 3) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${cat.category}" > "${sg.name}" 서브그룹의 volumeKeywords가 ${sg.volumeKeywords.length}개입니다. ` +
            "검색광고 API 효율을 위해 1~3개가 필요합니다.",
        );
      }
    }
    // TopicAngle 커버리지 검증: 모든 서브그룹에 대응하는 TopicAngle이 있어야 함
    for (const sg of cat.subGroups) {
      const hasAngle = cat.topicAngles.some((ta) => ta.subGroup === sg.name);
      if (!hasAngle) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${cat.category}" > "${sg.name}" 서브그룹에 topicAngle이 없습니다.`,
        );
      }
    }
  }
}

// 모듈 로드 시 즉시 검증
validateCategoryKeywords();
