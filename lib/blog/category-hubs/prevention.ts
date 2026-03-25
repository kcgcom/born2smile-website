import { defineCategoryHub, question, section } from "./shared";

export const preventionHub = defineCategoryHub({
  heroTitle: "예방관리 정보 허브",
  heroDescription: "스케일링 주기, 올바른 양치법, 치실·치간칫솔 사용, 잇몸 출혈과 구취 관리까지 매일 실천하는 예방관리 루틴을 정리했습니다.",
  intro: "예방관리는 특별한 치료보다 매일의 습관과 정기검진이 중요합니다. 집에서 바로 실천할 홈케어와 치과에서 점검할 항목을 함께 볼 수 있게 구성했습니다.",
  audience: [
    "스케일링과 정기검진 주기를 어떻게 잡아야 할지 궁금한 분",
    "양치·치실·치간칫솔 순서와 방법을 다시 정리하고 싶은 분",
    "잇몸 출혈, 구취, 치석이 반복되어 생활습관을 바꾸고 싶은 분",
  ],
  questions: [
    question("스케일링은 얼마나 자주 받아야 할까요?", "scaling-frequency-guide", "치석이 잘 생기는 정도와 잇몸 상태에 따라 주기가 달라지므로 정기검진에서 개인별 간격을 정하는 것이 좋습니다."),
    question("양치할 때 피가 나면 무엇을 먼저 확인해야 할까요?", "gum-disease-prevention", "출혈이 있다고 양치를 멈추기보다 잇몸 염증 여부를 점검하고 더 부드럽고 꼼꼼하게 관리하는 것이 중요합니다."),
    question("치실과 치간칫솔은 어떻게 다르게 써야 하나요?", "interdental-brush-waterpik-guide", "치아 사이 공간과 보철물 유무에 따라 적합한 도구가 달라지므로 상황에 맞게 병행하는 것이 효과적입니다."),
  ],
  featuredSlugs: ["scaling-frequency-guide", "correct-brushing-method", "gum-disease-prevention"],
  sections: [
    section("홈케어 기본기", "매일 하는 관리 습관부터 다시 잡아보세요.", ["correct-brushing-method", "dental-floss-guide", "interdental-brush-waterpik-guide", "mouthwash-effectiveness"]),
    section("정기검진과 스케일링", "내원 주기와 스케일링에 대한 오해를 정리했습니다.", ["scaling-frequency-guide", "airflow-scaling-benefits", "scaling-myths-and-facts", "after-scaling-care"]),
    section("잇몸과 구취 관리", "불편한 증상이 반복될 때 먼저 읽어볼 글들입니다.", ["gum-disease-prevention", "toothbrush-hygiene-tips", "fluoride-treatment-adults", "after-scaling-care"]),
  ],
});
