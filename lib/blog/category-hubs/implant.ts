import { defineCategoryHub, question, section } from "./shared";

export const implantHub = defineCategoryHub({
  heroTitle: "임플란트 정보 허브",
  heroDescription: "임플란트는 '내 상태로 가능한가'라는 첫 질문부터 비용과 보험 적용, 뼈이식 여부, 수술 후 회복 과정, 10년 이상 오래 쓰는 관리법까지 단계마다 궁금한 것이 달라집니다. 상담 전에 알아두면 진료가 훨씬 수월해지는 내용을 상담실에서 가장 자주 나오는 순서대로 정리했습니다.",
  audience: [
    "임플란트가 가능한지, 비용은 얼마인지 먼저 가늠해 보고 싶은 분",
    "뼈이식·통증·회복 기간이 걱정되어 치료 전후 흐름을 알고 싶은 분",
    "틀니·브릿지와 임플란트 중 어떤 선택이 더 맞을지 비교하고 싶은 분",
  ],
  questions: [
    question("내 상태로 임플란트가 가능한지 먼저 확인하고 싶어요.", "implant-eligibility-checklist", "잇몸뼈, 전신질환, 복용 약물, 흡연 여부에 따라 계획이 달라지므로 검사 항목부터 확인하는 것이 좋습니다."),
    question("뼈이식이 왜 필요한지, 꼭 해야 하는지 궁금해요.", "bone-graft-for-implant", "모든 경우에 필요한 것은 아니며, 잇몸뼈의 높이와 폭이 부족할 때 고려됩니다."),
    question("임플란트와 브릿지·틀니 중 어떤 선택이 더 맞는지 비교해 보고 싶어요.", "implant-vs-bridge-comparison", "남아 있는 치아 상태, 잇몸뼈, 관리 가능성에 따라 더 적합한 선택이 달라집니다."),
    question("임플란트 후 오래 쓰려면 무엇이 가장 중요한가요?", "peri-implantitis-prevention", "정기검진과 정확한 치간 관리, 흡연·이갈이 같은 위험요인 조절이 장기 유지에 가장 중요합니다."),
  ],
  sections: [
    section("대상 판단 · 상담 준비", "시술 가능 여부와 선택 기준을 먼저 이해하면 상담이 훨씬 쉬워집니다.", ["implant-eligibility-checklist", "diabetes-and-implant", "implant-pain-myths"]),
    section("수술과 회복", "뼈이식, 수술 후 통증, 회복 과정에서 자주 묻는 질문을 모았습니다.", ["bone-graft-for-implant", "after-implant-surgery-care", "implant-aftercare-tips"]),
    section("비교 · 선택 가이드", "임플란트·브릿지·틀니의 차이와 상황별 선택 기준을 정리했습니다.", ["implant-vs-bridge-comparison", "implant-brand-comparison"]),
    section("장기 유지와 수명", "10년 이상 쓰려면 알아야 할 관리법과 실패 원인을 확인하세요.", ["implant-lifespan-facts", "peri-implantitis-prevention"]),
  ],
});
