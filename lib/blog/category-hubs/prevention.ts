import { defineCategoryHub, question, section } from "./shared";

export const preventionHub = defineCategoryHub({
  heroTitle: "예방관리 정보 허브",
  heroDescription: "스케일링 주기, 올바른 양치법, 치실·치간칫솔 사용, 잇몸 출혈과 구취 관리까지 매일 실천하는 예방관리 루틴을 정리했습니다.",
  intro: "예방관리는 특별한 치료가 아니라 매일 반복하는 습관과 정기검진의 조합입니다. 집에서 바로 적용할 수 있는 홈케어와 치과에서 점검해야 할 항목을 같이 볼 수 있도록 구성했습니다.",
  audience: [
    "스케일링과 정기검진 주기를 어떻게 잡아야 할지 궁금한 분",
    "양치·치실·치간칫솔 순서와 방법을 다시 정리하고 싶은 분",
    "잇몸 출혈, 구취, 치석이 반복되어 생활습관을 바꾸고 싶은 분",
  ],
  questions: [
    question("스케일링은 얼마나 자주 받아야 할까요?", "scaling-frequency-guide"),
    question("양치할 때 피가 나면 무엇을 먼저 확인해야 할까요?", "gum-disease-prevention"),
    question("치실과 치간칫솔은 어떻게 다르게 써야 하나요?", "interdental-brush-waterpik-guide"),
  ],
  featuredSlugs: ["scaling-frequency-guide", "correct-brushing-method", "gum-disease-prevention"],
  sections: [
    section("홈케어 기본기", "매일 하는 관리 습관부터 다시 잡아보세요.", ["correct-brushing-method", "dental-floss-guide", "interdental-brush-waterpik-guide", "mouthwash-effectiveness"]),
    section("정기검진과 스케일링", "내원 주기와 스케일링에 대한 오해를 정리했습니다.", ["scaling-frequency-guide", "airflow-scaling-benefits", "scaling-myths-and-facts", "after-scaling-care"]),
    section("잇몸과 구취 관리", "불편한 증상이 반복될 때 먼저 읽어볼 글들입니다.", ["gum-disease-prevention", "toothbrush-hygiene-tips", "fluoride-treatment-adults", "after-scaling-care"]),
  ],
  faq: [
    { q: "스케일링은 치아를 깎는 치료인가요?", a: "아닙니다. 치석과 착색을 제거하는 예방 처치입니다. 오히려 방치된 치석이 잇몸 건강을 더 악화시킬 수 있습니다." },
    { q: "잇몸에서 피가 나면 양치를 쉬어야 하나요?", a: "대개는 오히려 더 부드럽고 꼼꼼한 관리가 필요합니다. 다만 출혈이 반복되면 잇몸 염증 여부를 확인하는 검진이 좋습니다." },
    { q: "치실과 치간칫솔은 둘 중 하나만 쓰면 되나요?", a: "치아 사이 공간 크기와 보철 유무에 따라 적합한 도구가 다릅니다. 상황에 맞게 병행하는 것이 가장 효과적인 경우가 많습니다." },
  ],
});
