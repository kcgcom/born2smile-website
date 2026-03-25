import { defineCategoryHub, question, section } from "./shared";

export const pediatricHub = defineCategoryHub({
  heroTitle: "소아치료 정보 허브",
  heroDescription: "첫 치과 방문 시기, 유치 관리, 성장기 교정 체크포인트, 아이 구강 습관까지 보호자가 먼저 알아두면 좋은 내용을 정리했습니다.",
  intro: "아이 치아는 성인과 달리 성장과 습관의 영향을 많이 받습니다. 첫 내원 준비부터 유치 관리, 외상 대처, 교정 체크포인트까지 보호자가 궁금해하는 질문을 상황별로 모았습니다.",
  audience: [
    "아이의 첫 치과 방문 시기와 준비물을 알고 싶은 보호자",
    "유치 충치나 구강 습관이 영구치에 미치는 영향을 이해하고 싶은 보호자",
    "성장기 치열 변화와 교정 검진 시점을 미리 알고 싶은 보호자",
  ],
  questions: [
    question("아이의 첫 치과 방문은 언제가 좋을까요?", "children-dental-care"),
    question("삐뚤어진 치아는 언제 교정 검진을 받아야 할까요?", "children-malocclusion-guide"),
    question("손가락 빨기 같은 구강 습관은 왜 문제일까요?", "children-oral-habits"),
  ],
  featuredSlugs: ["children-dental-care", "children-malocclusion-guide", "children-oral-habits"],
  sections: [
    section("첫 내원과 기본 관리", "처음 치과에 올 때 보호자가 알면 좋은 기본 정보입니다.", ["children-dental-care", "baby-teeth-cavity-treatment", "sealant-for-children"]),
    section("성장기 체크포인트", "치열 변화와 구강 습관을 조기에 확인할수록 도움이 됩니다.", ["children-malocclusion-guide", "children-oral-habits", "fluoride-treatment-children"]),
    section("치료 후 관리와 응급상황", "치료 후 집에서의 관리와 치아 외상 대처를 함께 정리했습니다.", ["after-child-dental-treatment-care", "children-dental-trauma"]),
  ],
  faq: [
    { q: "유치도 어차피 빠지는데 꼭 치료해야 하나요?", a: "유치는 씹기, 발음, 영구치 맹출 공간 유지에 중요한 역할을 합니다. 방치하면 통증과 염증, 치열 문제로 이어질 수 있습니다." },
    { q: "아이 치아교정은 언제부터 검사하면 좋나요?", a: "치열이 완전히 다 자라기 전이라도 성장 방향과 습관을 보는 조기 검진이 도움이 됩니다. 문제 종류에 따라 적절한 시점이 달라집니다." },
    { q: "불소도포와 실란트는 어떻게 다른가요?", a: "불소는 치아 표면을 강화해 충치를 예방하고, 실란트는 어금니 홈을 메워 음식물 끼임을 줄이는 예방 처치입니다." },
  ],
});
