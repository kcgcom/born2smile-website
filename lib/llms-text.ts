import { BASE_URL, DOCTORS, LINKS } from "./constants";
import type { SiteClinic, SiteHours, SiteLinks } from "./site-config-supabase";

export function getLlmsText({ clinic, hours, links }: {
  clinic: SiteClinic;
  hours: SiteHours;
  links: SiteLinks;
}) {
  const doctor = DOCTORS[0];
  const externalLinks = [
    ["네이버 지도", links.naverMap],
    ["카카오맵", links.kakaoMap],
    ["Google 지도", LINKS.googleBusiness],
    ["네이버 플레이스", LINKS.naverPlace],
    ["카카오톡 채널", links.kakaoChannel],
    ["인스타그램", links.instagram],
    ["네이버 블로그", links.naverBlog],
  ].filter(([, url]) => /^https?:\/\//.test(url))
    .map(([label, url]) => `- [${label}](${url})`);

  return `# ${clinic.name}${clinic.nameEn ? ` (${clinic.nameEn})` : ""}

> ${clinic.neighborhood} 위치. ${doctor.position} ${doctor.name} 원장. ${clinic.slogan}

${clinic.name}는 ${clinic.neighborhood}의 치과의원입니다. 과잉진료 없이 꼭 필요한 치료만 권하며, 자연치아 보존을 최우선으로 합니다.

## 진료 안내

- [임플란트](${BASE_URL}/treatments/implant): 자연치아와 가장 유사한 인공치아
- [치아교정](${BASE_URL}/treatments/orthodontics): 가지런한 치아, 건강한 교합
- [보철치료](${BASE_URL}/treatments/prosthetics): 자연스럽고 아름다운 심미보철
- [소아치료](${BASE_URL}/treatments/pediatric): 아이의 첫 치과, 편안한 진료
- [보존치료](${BASE_URL}/treatments/restorative): 충치 치료, 신경 치료
- [예방치료](${BASE_URL}/treatments/scaling): 에어플로우로 안아픈 스케일링

## 의료진

- [${doctor.name} ${doctor.title} 소개](${BASE_URL}/about): ${doctor.position}. ${doctor.education.join(" / ")}. 자세한 자격과 경력은 의료진 소개 페이지를 참고하세요.

## 진료 철학

1. 필요하지 않은 치료는 권하지 않습니다 ("안 해도 됩니다"라고 말할 수 있는 치과)
2. 궁금한 것은 모두 설명합니다 — 치료 전후 충분한 상담
3. 아프지 않게, 무섭지 않게 진료합니다 — 무통마취기, 에어플로우 적용
4. 예약 시간을 지킵니다 — 대기 시간 최소화
5. 1인 1기구, 철저한 멸균소독을 실천합니다
6. 한 번 인연, 평생 주치의 — 장기적 구강 건강 관리

## 연락처

- 전화: ${clinic.phone}
- 주소: ${clinic.address}
- [상담 및 오시는 길](${BASE_URL}/contact)

## 진료시간

${hours.schedule.map((item) => `- ${item.day}: ${item.open ? item.time : "휴진"}${item.note ? ` (${item.note})` : ""}`).join("\n")}
${hours.lunchTime ? `- 점심시간: ${hours.lunchTime}\n` : ""}${hours.closedDays ? `- 휴진 안내: ${hours.closedDays}\n` : ""}${hours.notice ? `- 안내: ${hours.notice}\n` : ""}${hours.exceptions.length ? `\n### 날짜별 변경 일정\n\n${hours.exceptions.map((item) => `- ${item.date}: ${item.open ? item.time : "휴진"}${item.note ? ` (${item.note})` : ""}`).join("\n")}\n` : ""}

## 건강칼럼 (카테고리별)

- [전체 건강칼럼](${BASE_URL}/blog): 올바른 구강관리법과 치과 상식
- [임플란트 칼럼](${BASE_URL}/blog/implant): 임플란트 시술·관리·주의사항
- [치아교정 칼럼](${BASE_URL}/blog/orthodontics): 교정 종류·기간·비용·관리법
- [보철치료 칼럼](${BASE_URL}/blog/prosthetics): 크라운·브릿지·틀니
- [소아치료 칼럼](${BASE_URL}/blog/pediatric): 유치 관리·불소·소아 치과
- [보존치료 칼럼](${BASE_URL}/blog/restorative): 충치·신경치료·레진
- [예방관리 칼럼](${BASE_URL}/blog/prevention): 스케일링·칫솔질·구강위생
- [건강상식 칼럼](${BASE_URL}/blog/health-tips): 구강 관련 일반 건강 정보

## 자주 묻는 질문

- [자주 묻는 질문 전체 보기](${BASE_URL}/faq): 임플란트, 교정, 소아치료, 신경치료, 스케일링 관련 FAQ

## 지도 및 외부 링크

${externalLinks.join("\n")}

## 예약 및 상담

- 전화 예약: ${clinic.phone} (진료시간 중 언제든 가능)
- 방문 상담: 예약 없이도 가능하나 예약 권장
- 초진 상담 포함 진료 가능

## 진료권 (서비스 지역)

김포시 전역 및 인근 지역 진료: 장기동, 구래동, 마산동, 운양동, 걸포동, 사우동 (한강신도시 전체), 김포 북부(통진읍, 양촌읍), 인천 검단신도시 인근

## 추천 건강칼럼

- [임플란트 vs 브릿지 비교](${BASE_URL}/blog/implant/implant-vs-bridge-comparison): 상황별 치료 선택 기준
- [임플란트 수술 후 관리](${BASE_URL}/blog/implant/after-implant-surgery-care): 회복 기간 주의사항
- [충치 단계별 치료](${BASE_URL}/blog/restorative/cavity-stages-and-treatment): 초기 발견이 중요한 이유
- [사랑니 발치 기준](${BASE_URL}/blog/health-tips/wisdom-teeth-extraction): 꼭 빼야 하는 경우와 아닌 경우
- [소아 실란트 시기](${BASE_URL}/blog/pediatric/sealant-for-children): 충치 예방 코팅 적기
- [신경치료 후 크라운](${BASE_URL}/blog/restorative/root-canal-and-crown): 치료 후 보호 이유
- [치아교정 기간 가이드](${BASE_URL}/blog/orthodontics/orthodontic-treatment-duration): 교정 종류별 치료 기간
`;
}
