// =============================================================
// 네이버 DataLab 키워드 택소노미
// 7개 블로그 카테고리 × 최대 5개 서브그룹 (API 제약: 요청당 최대 5그룹)
// =============================================================

import type { BlogCategoryValue } from "./blog/types";

export interface KeywordSubGroup {
  name: string;       // 서브그룹명 (예: "비용/가격")
  keywords: string[]; // 최대 20개 키워드 (네이버 DataLab API 그룹당 최대 20개)
}

export interface TopicAngle {
  template: string;  // 제목 템플릿 (예: "{year}년 {keyword} 총정리: {aspect}")
  subGroup: string;  // 연결된 서브그룹명 (KeywordSubGroup.name과 일치)
  aspect: string;    // 절사 앵글 (예: "건강보험 적용부터 종류별 가격 비교까지")
}

export interface CategoryKeywords {
  category: BlogCategoryValue; // 한국어 카테고리명
  slug: string;                // 영어 URL 슬러그 (CATEGORY_SLUG_MAP과 동일)
  subGroups: KeywordSubGroup[]; // 최대 5개 서브그룹 (API 제약)
  topicAngles: TopicAngle[];   // 블로그 주제 템플릿
}

// =============================================================
// CATEGORY_KEYWORDS — 7개 카테고리 키워드 택소노미
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
        ],
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
      },
      {
        name: "심미보철",
        keywords: [
          "라미네이트",
          "치아 미백",
          "심미 보철",
          "앞니 치료",
          "라미네이트 비용",
          "치아 성형",
          "앞니 크라운",
          "심미 치료",
        ],
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
        template: "{keyword}으로 달라지는 {aspect}",
        subGroup: "심미보철",
        aspect: "앞니 심미보철 전후 비교",
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
        ],
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
      },
      {
        name: "불소/실란트",
        keywords: [
          "불소 도포",
          "실란트",
          "치면 열구 전색",
          "어린이 불소",
          "불소 효과",
          "실란트 비용",
          "불소 안전성",
          "어린이 예방 치료",
        ],
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
        template: "{keyword} 효과와 비용: {aspect}",
        subGroup: "불소/실란트",
        aspect: "어린이 충치 예방 완벽 가이드",
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
        ],
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
        ],
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
    ],
  },
];

// =============================================================
// 런타임 검증 — subGroups.length <= 5 (네이버 DataLab API 제약)
// =============================================================

export function validateCategoryKeywords(): void {
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.subGroups.length > 5) {
      throw new Error(
        `[admin-naver-datalab-keywords] "${cat.category}" 카테고리의 서브그룹이 ${cat.subGroups.length}개입니다. ` +
          "네이버 DataLab API는 요청당 최대 5개 키워드 그룹만 허용합니다.",
      );
    }
    for (const sg of cat.subGroups) {
      if (sg.keywords.length > 20) {
        throw new Error(
          `[admin-naver-datalab-keywords] "${cat.category}" > "${sg.name}" 서브그룹의 키워드가 ${sg.keywords.length}개입니다. ` +
            "네이버 DataLab API는 그룹당 최대 20개 키워드만 허용합니다.",
        );
      }
    }
  }
}

// 모듈 로드 시 즉시 검증
validateCategoryKeywords();
