import { defineCategoryHub, question, section } from "./shared";

export const orthodonticsHub = defineCategoryHub({
  heroTitle: "치아교정 정보 허브",
  heroDescription: "교정 시기, 장치 선택, 통증과 식사, 유지장치 관리까지 치아교정 전후에 자주 묻는 질문을 상황별로 정리했습니다.",
  intro: "교정은 장치만 고르는 치료가 아니라 시작 시기, 기간, 관리 습관까지 함께 결정해야 하는 장기 계획입니다. 처음 상담받는 분이 순서대로 읽을 수 있도록 입문·비교·관리 흐름으로 구성했습니다.",
  audience: [
    "성인 교정이 가능한지, 시기를 놓친 건 아닌지 궁금한 분",
    "투명교정과 브라켓 교정 중 어떤 장치가 맞을지 비교하고 싶은 분",
    "교정 후 유지장치와 식사·위생관리까지 미리 알고 싶은 분",
  ],
  questions: [
    question("성인도 지금 교정을 시작해도 괜찮을까요?", "orthodontics-for-adults"),
    question("투명교정과 브라켓 교정은 어떻게 다를까요?", "clear-vs-bracket-orthodontics"),
    question("교정이 끝난 뒤 유지장치는 왜 중요한가요?", "retainer-after-orthodontics"),
  ],
  featuredSlugs: ["orthodontics-for-adults", "clear-vs-bracket-orthodontics", "retainer-after-orthodontics"],
  sections: [
    section("교정 시작 전", "치료 시기와 대상을 먼저 이해하면 상담 포인트가 선명해집니다.", ["orthodontics-for-adults", "senior-orthodontics", "orthodontic-treatment-duration"]),
    section("장치 선택과 생활", "장치별 차이와 식사·관리 루틴을 함께 확인하세요.", ["clear-vs-bracket-orthodontics", "orthodontic-diet-guide", "after-orthodontic-device-care"]),
    section("치료 후 유지관리", "교정 후 되돌아가지 않도록 유지장치와 장기 관리법을 정리했습니다.", ["retainer-after-orthodontics", "clear-aligner-care-guide"]),
  ],
  faq: [
    { q: "성인도 치아교정 효과를 볼 수 있나요?", a: "성인도 충분히 가능합니다. 다만 잇몸 상태, 기존 보철물, 교합 상태에 따라 계획과 기간이 달라질 수 있습니다." },
    { q: "투명교정이 모든 경우에 가능한가요?", a: "경미한 이동에는 적합하지만 치아 이동량이 크거나 복합적인 교합 조정이 필요하면 다른 장치가 더 적합할 수 있습니다." },
    { q: "교정 후 유지장치는 얼마나 해야 하나요?", a: "치아는 원래 위치로 돌아가려는 성향이 있어 장기간 유지가 필요합니다. 초기에는 더 철저히, 이후에도 정기적으로 상태를 점검하는 것이 좋습니다." },
  ],
});
