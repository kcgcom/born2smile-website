import { expect, test } from "@playwright/test";
import { CLINIC_BASE, HOURS, LINKS } from "../lib/constants";
import { getLlmsText } from "../lib/llms-text";

test("운영 설정 변경을 병원 정보·진료시간·예외 일정·링크에 반영한다", () => {
  const text = getLlmsText({
    clinic: { ...CLINIC_BASE, name: "테스트치과", nameEn: "Test Dental", phone: "031-111-2222", address: "변경된 주소" },
    hours: {
      ...HOURS,
      schedule: [{ day: "월요일", open: true, time: "10:00 - 17:00" }, { day: "화요일", open: false, time: "" }],
      lunchTime: "12:00 - 13:00", notice: "변경 안내", closedDays: "일요일 휴진",
      exceptions: [{ date: "2026-12-25", open: false, time: "" }, { date: "2026-12-26", open: true, time: "10:00 - 12:00", note: "단축진료" }],
    },
    links: { ...LINKS, naverMap: "https://naver.me/example", kakaoChannel: "", instagram: "" },
  });
  for (const value of ["# 테스트치과 (Test Dental)", "031-111-2222", "변경된 주소", "월요일: 10:00 - 17:00", "화요일: 휴진", "점심시간: 12:00 - 13:00", "변경 안내", "2026-12-25: 휴진", "2026-12-26: 10:00 - 12:00 (단축진료)", "https://naver.me/example"]) {
    expect(text).toContain(value);
  }
  for (const stale of ["1833-7552", "Seoul Born Dental Clinic", "평점", "건강보험 적용 안내", "굿닥", "카카오톡 채널"])
    expect(text).not.toContain(stale);
});

test("llms.txt는 공개 텍스트로 응답하며 상담 페이지와 운영 정보가 일치한다", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const text = await response.text();
  const contact = await request.get("/contact");
  expect(contact.status()).toBe(200);
  const scripts = [...(await contact.text()).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const clinic = scripts.map((match) => JSON.parse(match[1])).find((item) => item["@id"]?.endsWith("/#organization"));
  expect(clinic).toBeTruthy();
  expect(text).toContain(`# ${clinic.name}`);
  expect(text).toContain(clinic.alternateName.at(-1));
  expect(text).toContain(clinic.address.streetAddress);
  expect(text).toContain(clinic.telephone.replace(/^\+82-/, ""));
  expect(text).not.toContain("건강보험 적용 안내");
  expect(text).not.toContain("Google 리뷰: 5.0");
});
