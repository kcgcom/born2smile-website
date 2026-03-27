import { defineCategoryHub, question, section } from "./shared";

export const restorativeHub = defineCategoryHub({
  heroTitle: "보존치료 정보 허브",
  heroDescription: "충치를 발견했을 때 '얼마나 심각한가', '지금 당장 치료해야 하는가'를 알기 어렵습니다. 충치 단계별 치료 기준, 레진과 인레이의 선택 차이, 신경치료가 필요한 시점과 그 이후 크라운 관리까지 — 자연치아를 최대한 오래 살리는 판단 기준을 정리했습니다.",
  intro: "언제 치료하고 어떤 재료를 쓸지 — 자연치아를 지키는 판단 기준을 단계별로 정리했습니다.",
  audience: [
    "충치가 어느 정도면 치료가 필요한지 기준이 궁금한 분",
    "레진과 인레이, 신경치료와 크라운의 차이를 이해하고 싶은 분",
    "치아가 깨지거나 시릴 때 어떤 치료가 필요한지 먼저 알고 싶은 분",
  ],
  questions: [
    question("충치는 어느 단계부터 치료가 필요할까요?", "cavity-stages-and-treatment", "초기 충치는 증상이 거의 없더라도 진행 정도에 따라 조기 치료가 필요한 경우가 많습니다."),
    question("레진과 인레이는 어떤 차이가 있나요?", "resin-vs-inlay-comparison", "비용만이 아니라 손상 범위, 강도, 제작 방식, 심미성까지 함께 고려해야 합니다."),
    question("신경치료 후 왜 크라운을 권하는 걸까요?", "root-canal-and-crown", "신경치료 후 치아는 약해질 수 있어 파절 예방과 장기 사용을 위해 크라운이 권장되는 경우가 많습니다."),
  ],
  sections: [
    section("충치와 초기 손상", "자연치아를 살릴 수 있는 시점을 이해하는 데 도움이 됩니다.", ["cavity-stages-and-treatment", "after-filling-care", "cracked-tooth-syndrome"]),
    section("재료 선택과 비교", "치료 범위와 재료 선택 기준을 비교해 보세요.", ["resin-vs-inlay-comparison", "old-amalgam-replacement", "cracked-tooth-syndrome"]),
    section("신경치료와 응급상황", "통증과 파절 상황에서 무엇을 확인해야 하는지 정리했습니다.", ["root-canal-and-crown", "root-canal-pain-truth", "after-root-canal-care", "resin-vs-inlay-comparison"]),
  ],
});
