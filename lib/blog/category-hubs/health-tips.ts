import { defineCategoryHub, question, section } from "./shared";

export const healthTipsHub = defineCategoryHub({
  heroTitle: "구강 건강 상식 허브",
  heroDescription: "생활습관, 전신질환, 스트레스, 임신·출산, 자주 헷갈리는 치과 상식을 묶어 가족이 함께 읽기 좋은 구강 건강 가이드를 만들었습니다.",
  intro: "건강상식 카테고리는 특정 치료보다 생활 습관과 증상 이해에 초점이 있습니다. 언제 치과에 가야 하는지, 생활 습관이 구강 건강에 어떤 영향을 주는지, 가족 상황별로 무엇을 조심해야 하는지 중심으로 정리했습니다.",
  audience: [
    "치과에 바로 가야 할 증상인지 생활 습관으로 먼저 점검할지 판단하고 싶은 분",
    "스트레스·수면·식습관·약물처럼 일상 요인이 치아에 미치는 영향을 알고 싶은 분",
    "임신·출산·만성질환 같은 상황에서 구강관리를 더 신경 쓰고 싶은 분",
  ],
  questions: [
    question("스트레스와 이갈이는 치아에 어떤 영향을 줄까요?", "stress-and-teeth-grinding"),
    question("치과 치료가 무서울 때 불안을 줄이는 방법이 있을까요?", "dental-anxiety-tips"),
    question("당뇨병 같은 전신질환은 구강 건강과 어떻게 연결될까요?", "diabetes-and-dental-health"),
  ],
  featuredSlugs: ["dental-anxiety-tips", "stress-and-teeth-grinding", "diabetes-and-dental-health"],
  sections: [
    section("생활습관과 증상", "일상 습관이 치아와 잇몸에 주는 영향을 먼저 읽어보세요.", ["stress-and-teeth-grinding", "dry-mouth-syndrome", "mouth-breathing-dental-effects", "smoking-oral-health"]),
    section("가족과 생애주기별 관리", "임신·출산 등 생애주기에 따라 달라지는 관리 포인트입니다.", ["pregnancy-dental-treatment-safety", "postpartum-dental-health", "dental-anxiety-tips", "coffee-teeth-staining"]),
    section("질환과 전신 건강 연결", "구강과 전신 건강의 연결성을 쉽게 이해할 수 있는 글들입니다.", ["diabetes-and-dental-health", "medication-oral-side-effects", "tongue-health-signs", "gum-color-changes"]),
  ],
  faq: [
    { q: "스트레스가 정말 치아 문제를 만들 수 있나요?", a: "가능합니다. 이갈이, 턱관절 불편, 구강건조, 통증 민감도 증가처럼 간접적인 문제로 이어질 수 있습니다." },
    { q: "임신 중에도 치과 치료가 가능한가요?", a: "필요한 처치는 가능하지만 시기와 치료 종류에 따라 조정이 필요합니다. 통증이나 염증이 있으면 미루지 말고 상담받는 것이 좋습니다." },
    { q: "전신질환이 있으면 구강관리도 달라져야 하나요?", a: "네. 당뇨병, 약물 복용, 면역 상태 등에 따라 잇몸 염증과 회복 양상이 달라질 수 있어 더 세심한 관리가 필요합니다." },
  ],
});
