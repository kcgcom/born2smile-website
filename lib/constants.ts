// =============================================================
// 서울본치과 - 병원 공통 정보
// 이 파일 하나만 수정하면 사이트 전체에 반영됩니다.
// =============================================================

// -------------------------------------------------------------
// 기본 정보
// -------------------------------------------------------------
export const CLINIC = {
  name: "서울본치과",
  nameEn: "Seoul Born Dental Clinic",
  slogan: "당신의 미소를 디자인합니다",
  phone: "1833-7552",
  phoneIntl: "+82-1833-7552",
  phoneHref: "tel:1833-7552",
  address: "경기도 김포시 태장로 820, 엠프라자 2층 (장기동)",
  addressShort: "김포시 태장로 820, 엠프라자 2층",
  neighborhood: "한강신도시 장기동",
  businessNumber: "647-18-00478", // 사업자등록번호
  representative: "김창균", // 대표자
} as const;

// -------------------------------------------------------------
// 의료진
// -------------------------------------------------------------
export const DOCTORS = [
  {
    id: "kim-changgyun",
    name: "김창균",
    title: "대표원장",
    position: "치과의사, 통합치의학전문의",
    education: [
      "서울대학교 치의학대학원 박사 수료",
      "서울대학교 치의학대학원 석사 졸업",
      "서울대학교 공과대학 학사 졸업",
      "서울과학고등학교 졸업",
    ],
    credentials: [
      "미국 치과의사 자격시험(National Board of Dental Examination) 통과",
      "미국치과임플란트학회(AAID) 인정의(Affiliate Associate Fellow)",
      "미국치과임플란트학회(AAID) 공인 임플란트과정 수료",
      "Dr. Kitzis Memorial Institute 보철 및 통합치과과정 수료",
      "Dr. Kitzis Memorial Institute 교정과정 수료",
      "보스톤 임상치과 연구회(BAO) 교정과정 수료",
    ],
    memberships: [
      "국제교정협회(IAO) 정회원",
      "국제구강임플란트학회(ICOI) 국제회원",
      "대한치과이식임플란트학회(KAID) 정회원",
      "한국심는치아연구회(KDI) 정회원",
      "미국심미치과학회(AACD) 정회원",
      "대한심미치과학회(KAED) 정회원",
    ],
    currentPositions: [
      "일본 아이치가쿠인(愛知學院)치과대학병원 임플란트과 협진의사",
      "서울대학교 치의학색채공학 연구실 임상자문위원",
    ],
    specialties: ["임플란트", "심미보철", "치아교정"],
    image: "/images/doctors/kim-changgyun.jpg",
  },
] as const;

// -------------------------------------------------------------
// 진료시간
// -------------------------------------------------------------
export const HOURS = {
  schedule: [
    { day: "월요일", time: "09:30 - 18:30", open: true },
    { day: "화요일", time: "09:30 - 20:30", open: true, note: "야간진료" },
    { day: "수요일", time: "휴진", open: false },
    { day: "목요일", time: "09:30 - 18:30", open: true },
    { day: "금요일", time: "09:30 - 18:30", open: true },
    { day: "토요일", time: "09:30 - 13:30", open: true },
    { day: "일요일", time: "휴진", open: false },
  ],
  lunchTime: "13:00 - 14:00",
  closedDays: "공휴일 휴진",
  notice: "토요일은 점심시간 없이 진료합니다",
} as const;

// -------------------------------------------------------------
// 진료 과목
// -------------------------------------------------------------
export const TREATMENTS = [
  {
    id: "implant",
    name: "임플란트",
    shortDesc: "자연치아와 가장 유사한 인공치아",
    icon: "implant", // Lucide 아이콘 이름 또는 커스텀 아이콘
    href: "/treatments/implant",
  },
  {
    id: "orthodontics",
    name: "치아교정",
    shortDesc: "가지런한 치아, 건강한 교합",
    icon: "orthodontics",
    href: "/treatments/orthodontics",
  },
  {
    id: "prosthetics",
    name: "보철치료(틀니·심미보철)",
    shortDesc: "자연스럽고 아름다운 보철 치료",
    icon: "prosthetics",
    href: "/treatments/prosthetics",
  },
  {
    id: "pediatric",
    name: "소아치료",
    shortDesc: "아이의 첫 치과, 편안한 진료",
    icon: "pediatric",
    href: "/treatments/pediatric",
  },
  {
    id: "restorative",
    name: "보존치료",
    shortDesc: "충치 치료, 신경 치료",
    icon: "restorative",
    href: "/treatments/restorative",
  },
  {
    id: "scaling",
    name: "예방치료",
    shortDesc: "에어플로우로 안아픈 스케일링",
    icon: "scaling",
    href: "/treatments/scaling",
  },
] as const;

// -------------------------------------------------------------
// 환자 후기 — 리뷰 남기기 링크
// Place ID를 입력하면 리뷰 남기기 버튼이 자동으로 활성화됩니다.
// Google: https://developers.google.com/maps/documentation/places/web-service/place-id
// Naver: 네이버 지도에서 검색 → URL의 /place/ 뒤 숫자 (예: map.naver.com/v5/entry/place/1234567890)
// -------------------------------------------------------------
export const GOOGLE_REVIEW = {
  placeId: "ChIJv6ztq7eGfDURXB0HJQ3ZpQg", // Google Place ID — 입력하면 리뷰 남기기 버튼 활성화
  get writeReviewUrl() {
    return this.placeId
      ? `https://search.google.com/local/writereview?placeid=${this.placeId}`
      : "";
  },
} as const;

export const NAVER_REVIEW = {
  placeId: "698879488", // 네이버 플레이스 ID — 입력하면 리뷰 남기기 버튼 활성화
  get writeReviewUrl() {
    return this.placeId
      ? `https://m.place.naver.com/hospital/${this.placeId}/review/visitor`
      : "";
  },
} as const;

export interface Review {
  name: string; // 환자 이름 (익명 처리, 예: "○○○")
  rating: number; // 별점 (1-5)
  text: string; // 후기 내용
  source: "naver" | "google"; // 리뷰 출처 플랫폼
  date: string; // 작성일 (YYYY-MM)
}

export const REVIEWS: Review[] = [
  {
    name: "○○○",
    rating: 5,
    text: "치과공포 너무너무너무 심한데 여기 왜이리 친절하신가요ㅠㅠㅠ 약간 극복된 듯 합니다…. 이 자리에 오래오래 계셔주세요",
    source: "naver",
    date: "2026-01",
  },
  {
    name: "○○○",
    rating: 5,
    text: "에어플로우 스케일링 처음 받아봤는데 정말 안 아프더라구요. 스케일링 할때마다 긴장이 많이 되었는데, 앞으로도 계속 에어플로우 스케일링으로 받아야겠다고 마음먹었습니다.",
    source: "google",
    date: "2026-02",
  },
  {
    name: "○○○",
    rating: 5,
    text: "아이 충치 치료 때문에 갔는데 치과 분위기가 너무 편안해서 아이도 무서워하지 않았어요. 친절한 설명에 저도 믿음이 갔습니다. 정말 감사해요!",
    source: "naver",
    date: "2025-12",
  },
  {
    name: "○○○",
    rating: 5,
    text: "너무 정직하게 진료하고 치료해주셔서 갈때마다 더 믿음이 생깁니다. 신랑이 타치과에서 교정하다 문제 생긴것도 다른 치과에서는 안봐주셨는데 다시 봐주시고 아이들 치아 교정도 잘 해 주셨습니다. 감사합니다",
    source: "google",
    date: "2025-11",
  },
  {
    name: "○○○",
    rating: 5,
    text: "과잉 진료 없이 꼭 필요한 치료만 권해주셨고, 설명도 이해하기 쉽게 해주셔서 좋았습니다. 치료도 매우 섬세하게 진행해주셔서 편안한 마음으로 잘 받을 수 있었어요.",
    source: "google",
    date: "2025-10",
  },
  {
    name: "○○○",
    rating: 5,
    text: "인생치과. 선생님들 정말 친절하심. 과잉진료도 전혀 없고 너무 잘 봐주심. 이사갔는데도 불구하고 계속 여기로 옴.",
    source: "naver",
    date: "2025-09",
  },
];

// -------------------------------------------------------------
// SNS / 외부 링크
// -------------------------------------------------------------
export const LINKS = {
  // 실제 URL을 입력하면 Footer, Contact 페이지, JSON-LD sameAs에 자동 반영됩니다.
  kakaoChannel: "", // 카카오톡 채널 URL → Contact 페이지 카카오 상담 버튼 + Footer 아이콘
  instagram: "", // 인스타그램 URL → Footer 아이콘
  naverBlog: "", // 네이버 블로그 URL → Footer 아이콘
  naverMap: "", // 네이버 지도 링크 → Footer 아이콘
  kakaoMap: "", // 카카오맵 링크
} as const;

// -------------------------------------------------------------
// 지도 좌표 (카카오맵용)
// -------------------------------------------------------------
export const MAP = {
  lat: 37.6319,
  lng: 126.7150,
  zoomLevel: 4, // 카카오맵 level (1~14, 숫자가 작을수록 확대)
} as const;

// -------------------------------------------------------------
// 사이트 URL
// -------------------------------------------------------------
export const BASE_URL = "https://www.born2smile.co.kr";

// -------------------------------------------------------------
// SEO 메타데이터
// -------------------------------------------------------------
export const SEO = {
  defaultTitle: "서울본치과 | 김포한강신도시 장기동 치과",
  titleTemplate: "%s | 서울본치과 김포한강신도시 장기동 치과",
  defaultDescription:
    "김포한강신도시 장기동 서울본치과입니다. 김포 장기동 치과 임플란트, 치아교정, 심미보철, 소아치료, 보존치료, 에어플로우, 안아픈 스케일링. 서울대 출신 통합치의학전문의가 정성을 다해 진료합니다.",
  keywords: [
    "김포치과",
    "김포시치과",
    "장기동치과",
    "김포장기동치과",
    "김포한강신도시치과",
    "한강신도시치과",
    "김포한강신도시",
    "김포장기동",
    "김포임플란트",
    "장기동임플란트",
    "한강신도시임플란트",
    "김포치아교정",
    "장기동치아교정",
    "한강신도시치아교정",
    "서울본치과",
    "태장로치과",
    "김포스케일링",
    "장기동스케일링",
    "한강신도시스케일링",
    "안아픈스케일링",
    "에어플로우스케일링",
    "스케일링잘하는치과",
    "김포스케일링잘하는치과",
  ],
} as const;
