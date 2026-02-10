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
  phoneHref: "tel:1833-7552",
  address: "경기도 김포시 태장로 820, 엠프라자 2층",
  addressShort: "김포시 태장로 820, 엠프라자 2층",
  // TODO: 확정 후 입력
  businessNumber: "000-00-00000", // 사업자등록번호
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
      "일본 아이치가쿠인(愛和學院)치과대학병원 임플란트과 협진의사",
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
  closedDays: "수요일, 일요일, 공휴일 휴진",
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
    name: "틀니 및 심미보철",
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
    name: "스케일링",
    shortDesc: "잇몸 건강을 위한 정기 관리",
    icon: "scaling",
    href: "/treatments/scaling",
  },
] as const;

// -------------------------------------------------------------
// SNS / 외부 링크
// -------------------------------------------------------------
export const LINKS = {
  // TODO: 실제 링크로 교체
  kakaoChannel: "", // 카카오톡 채널 URL
  instagram: "",
  naverBlog: "",
  naverMap: "", // 네이버 지도 링크
  kakaoMap: "", // 카카오맵 링크
} as const;

// -------------------------------------------------------------
// 지도 좌표 (카카오맵용)
// -------------------------------------------------------------
export const MAP = {
  lat: 37.6319, // TODO: 정확한 좌표 확인
  lng: 126.7150, // TODO: 정확한 좌표 확인
  zoomLevel: 3,
} as const;

// -------------------------------------------------------------
// SEO 메타데이터
// -------------------------------------------------------------
export const SEO = {
  defaultTitle: "서울본치과 | 김포 치과",
  titleTemplate: "%s | 서울본치과",
  defaultDescription:
    "경기도 김포시 서울본치과입니다. 임플란트, 치아교정, 심미보철, 소아치료, 보존치료, 스케일링. 정성을 다하는 진료로 건강한 미소를 만들어 드립니다.",
  keywords: [
    "김포치과",
    "김포시치과",
    "김포임플란트",
    "김포치아교정",
    "서울본치과",
    "태장동치과",
  ],
  ogImage: "/images/og-image.jpg",
} as const;
