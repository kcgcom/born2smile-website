import { CLINIC_BASE } from "./constants";

export const INSURANCE_PRINT_DEFAULTS = {
  clinicName: "서울본치과의원",
  doctorName: "김창균",
  licenseNumber: "28144",
  phone: "070-4633-6940",
  institutionNumber: "3157-5960",
  businessNumber: CLINIC_BASE.businessNumber,
};

export const INSURANCE_PRINT_FIELD_LABELS = {
  clinicName: "병원명",
  doctorName: "의사명",
  licenseNumber: "면허번호",
  phone: "전화번호",
  institutionNumber: "요양기관번호",
  businessNumber: "사업자등록번호",
} satisfies Record<keyof typeof INSURANCE_PRINT_DEFAULTS, string>;

export type InsurancePrintField = keyof typeof INSURANCE_PRINT_DEFAULTS;
export type InsurancePrintValues = Record<InsurancePrintField, string>;

type PhonePart = "area" | "exchange" | "line" | "local" | "prefix";

// Each entry gives the text baseline and available width in PDF points from the top left.
export type InsurancePrintPosition = readonly [
  field: InsurancePrintField,
  x: number,
  baseline: number,
  width: number,
  phonePart?: PhonePart,
  anchor?: "middle",
];

const LINA_LIFE_POSITIONS: readonly InsurancePrintPosition[] = [
  ["clinicName", 103, 757, 99], ["doctorName", 289, 757, 65], ["licenseNumber", 429, 757, 116],
  ["phone", 109, 774, 23, "area"], ["phone", 141, 774, 31, "exchange"], ["phone", 182, 774, 34, "line"],
  ["institutionNumber", 289, 774, 80],
];

// Match the registered PDF bytes so a replacement form cannot inherit old positions.
const POSITIONS_BY_HASH = new Map<string, readonly InsurancePrintPosition[]>([
  // AIA생명
  ["0c31894c491472d7de95b9b2500bdda949bb807049d6941efb1bc45857e5e916", [
    ["clinicName", 147, 755, 113], ["doctorName", 377, 755, 114],
    ["phone", 147, 772, 113], ["licenseNumber", 377, 772, 114],
  ]],
  // AXA손해보험은 요양기관기호와 사업자번호를 한 칸에서 선택한다.
  ["023d5be41ca891f6a14dcc63353cd0086c5d7c62e3a522fe6de267edc9328d39", [
    ["clinicName", 123, 768.5, 45], ["doctorName", 200, 768.5, 38], ["licenseNumber", 261, 768.5, 89],
    ["institutionNumber", 361, 768.5, 100],
    ["phone", 481, 768.5, 11.5, "area", "middle"], ["phone", 495, 768.5, 42, "local"],
  ]],
  // DB손해보험
  ["33f98849d65042d0e41f85baa0cb84cc393c5b684d43bdb134f86cc7c287cc0b", [
    ["clinicName", 103, 761.5, 79], ["doctorName", 293.5, 761.5, 60], ["licenseNumber", 471, 761.5, 74],
    ["phone", 103, 776, 105],
  ]],
  // KB손해보험
  ["30debf4471c64f3fc0b8eec1934535d1e4a551e9058caab60827208c0a24373f", [
    ["clinicName", 83, 423, 115], ["doctorName", 294, 423, 85], ["licenseNumber", 468, 423, 101],
    ["phone", 87, 442, 22, "area"], ["phone", 119, 442, 37, "exchange"], ["phone", 168, 442, 42, "line"],
  ]],
  // 라이나손해보험
  ["921e5fcdce921e8034147445036abe98ab92b829781d480443896da59209c5aa", [
    ["clinicName", 195.5, 789.5, 90, undefined, "middle"],
    ["institutionNumber", 297.5, 789.5, 90, undefined, "middle"],
    ["phone", 399.5, 789.5, 90, undefined, "middle"],
    ["doctorName", 501.5, 789.5, 90, undefined, "middle"],
  ]],
  // 삼성화재
  ["e0009a087bf6d92e60f7697103fd888e6d0898c7bbb8992621fd0dfe40bac74c", [
    ["clinicName", 102, 726, 101], ["doctorName", 280, 726, 94], ["licenseNumber", 445, 726, 94],
    ["businessNumber", 102, 740, 123], ["phone", 285, 740, 16, "area"], ["phone", 309, 740, 80, "local"],
  ]],
  // 신한라이프
  ["a674914ff43213d00311055803f4ba19aadeb39be80ba36bff6bb57f7e5c8602", [
    ["clinicName", 105, 723, 135], ["doctorName", 366, 723, 136], ["institutionNumber", 105, 739, 193],
    ["licenseNumber", 366, 739, 136], ["phone", 105, 756, 193],
  ]],
  // 우체국보험
  ["6a539b5ebb81113ff19a2849248ce1b088a3ed9a2511e5e37b58afc0cf1c1710", [
    ["clinicName", 133, 694, 118], ["doctorName", 368, 694, 119], ["phone", 133, 712, 147],
    ["licenseNumber", 368, 712, 145], ["institutionNumber", 133, 731, 147],
  ]],
  // 하나생명
  ["074389dae1a4a1947f14fe3334055b14b8f18b530a453c482f8a955b09756955", [
    ["clinicName", 90, 717, 91], ["doctorName", 267, 717, 94], ["licenseNumber", 452, 717, 109],
    ["institutionNumber", 90, 737, 111], ["phone", 267, 737, 114],
  ]],
  // 현대해상
  ["8e7a5e4c71b34d98d49228e035976bd362b90b2fb5cc9f5caf9ab53925af893d", [
    ["clinicName", 109, 683, 99], ["doctorName", 323, 704, 192], ["licenseNumber", 305, 683, 100],
    ["phone", 470, 683, 41, "prefix"], ["phone", 522, 683, 41, "line"],
  ]],
  // 흥국화재
  ["2ea3fe8f1c10b38179519b1b73fdb3d9a3aa64e42e7ecb8265aab4cb01b3a0d2", [
    ["clinicName", 98, 764, 88], ["doctorName", 276, 764, 92], ["licenseNumber", 470, 764, 65],
    ["phone", 98, 786, 82],
  ]],
  // 라이나생명 충전·크라운과 임플란트·브릿지·틀니
  ["d3c6e76f879d9964297852902d92d69118335adc9bb17d57f5ed2a47552c3d8d", LINA_LIFE_POSITIONS],
  ["8d351cc087abfe37199bc038cac08987b44fe9cb31c9bad465b4b910d64ccddc", LINA_LIFE_POSITIONS],
]);

export async function getInsurancePrintPositions(pdf: ArrayBuffer): Promise<readonly InsurancePrintPosition[]> {
  if (!globalThis.crypto?.subtle) return [];
  const digest = await crypto.subtle.digest("SHA-256", pdf);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return POSITIONS_BY_HASH.get(hash) ?? [];
}

export function splitInsurancePrintPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const areaLength = digits.startsWith("02") ? 2 : 3;
  const area = digits.slice(0, areaLength);
  const exchange = digits.slice(areaLength, -4);
  const line = digits.slice(-4);
  if (!/^\d{3,4}$/.test(exchange) || !/^[\d()\s-]+$/.test(phone)) return null;
  return { area, exchange, line, local: `${exchange}-${line}`, prefix: `${area}-${exchange}` };
}
