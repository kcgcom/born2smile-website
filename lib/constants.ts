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
    // TODO: 경력 정보 추가 예정
    credentials: [
      // 예시 - 실제 경력으로 교체
      // "서울대학교 치의학대학원 졸업",
      // "대한치과보철학회 정회원",
    ],
    specialties: ["임플란트", "심미보철"],
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
