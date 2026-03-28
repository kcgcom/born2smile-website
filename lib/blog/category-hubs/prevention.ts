import { defineCategoryHub, question, section } from "./shared";

export const preventionHub = defineCategoryHub({
  heroTitle: "예방관리 정보 허브",
  heroDescription: "치과를 자주 가지 않아도 되는 가장 확실한 방법은 예방입니다. 올바른 양치법과 치실 순서부터 스케일링 적절한 주기, 잇몸 출혈과 구취가 반복될 때 점검할 사항까지 — 집에서 매일 실천하는 홈케어와 정기검진을 함께 갖추는 방법을 정리했습니다.",
  audience: [
    "스케일링과 정기검진 주기를 어떻게 잡아야 할지 궁금한 분",
    "양치·치실·치간칫솔 순서와 방법을 다시 정리하고 싶은 분",
    "잇몸 출혈, 구취, 치석이 반복되어 생활습관을 바꾸고 싶은 분",
  ],
  questions: [
    question("스케일링은 얼마나 자주 받아야 할까요?", "scaling-frequency-guide", "치석이 잘 생기는 정도와 잇몸 상태에 따라 주기가 달라지므로 정기검진에서 개인별 간격을 정하는 것이 좋습니다."),
    question("양치할 때 피가 나면 무엇을 먼저 확인해야 할까요?", "gum-disease-prevention", "출혈이 있다고 양치를 멈추기보다 잇몸 염증 여부를 점검하고 더 부드럽고 꼼꼼하게 관리하는 것이 중요합니다."),
    question("치실과 치간칫솔은 어떻게 다르게 써야 하나요?", "interdental-brush-waterpik-guide", "치아 사이 공간과 보철물 유무에 따라 적합한 도구가 달라지므로 상황에 맞게 병행하는 것이 효과적입니다."),
    question("에어플로우 스케일링은 일반 스케일링과 어떻게 다른가요?", "airflow-scaling-benefits", "초음파 기구 대신 미세 분말과 물을 분사하는 방식이라 시린 증상과 불편감이 적고, 색소 침착 제거에 특히 효과적입니다."),
  ],
  sections: [
    section("홈케어 기본기", "매일 하는 관리 습관부터 다시 잡아보세요.", ["correct-brushing-method", "dental-floss-guide", "interdental-brush-waterpik-guide", "mouthwash-effectiveness"]),
    section("정기검진과 스케일링", "내원 주기와 스케일링에 대한 오해를 정리했습니다.", ["scaling-frequency-guide", "airflow-scaling-benefits", "scaling-myths-and-facts", "after-scaling-care"]),
    section("잇몸과 구취 관리", "불편한 증상이 반복될 때 먼저 읽어볼 글들입니다.", ["gum-disease-prevention", "toothbrush-hygiene-tips", "fluoride-treatment-adults", "after-scaling-care"]),
  ],
});
