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
    question("아이의 첫 치과 방문은 언제가 좋을까요?", "children-dental-care", "첫 유치가 나온 뒤부터는 기본 구강관리와 생활 습관을 함께 점검하는 방문이 도움이 됩니다."),
    question("삐뚤어진 치아는 언제 교정 검진을 받아야 할까요?", "children-malocclusion-guide", "치열이 모두 나올 때까지 기다리지 않아도 되고, 성장 방향과 습관을 보는 조기 검진이 도움이 될 수 있습니다."),
    question("손가락 빨기 같은 구강 습관은 왜 문제일까요?", "children-oral-habits", "반복되는 습관은 치열과 턱 성장 방향에 영향을 줄 수 있어 조기 파악이 중요합니다."),
    question("불소도포와 실란트는 어떻게 다른가요?", "fluoride-vs-sealant-children", "불소는 치아 표면을 강화하고, 실란트는 어금니 홈을 메워 충치를 예방하는 서로 다른 예방 처치입니다."),
  ],
  featuredSlugs: ["children-dental-care", "children-malocclusion-guide", "children-oral-habits"],
  sections: [
    section("첫 내원과 기본 관리", "처음 치과에 올 때 보호자가 알면 좋은 기본 정보입니다.", ["children-dental-care", "baby-teeth-cavity-treatment", "sealant-for-children"]),
    section("성장기 체크포인트", "치열 변화와 구강 습관을 조기에 확인할수록 도움이 됩니다.", ["children-malocclusion-guide", "children-oral-habits", "fluoride-treatment-children"]),
    section("치료 후 관리와 응급상황", "치료 후 집에서의 관리와 치아 외상 대처를 함께 정리했습니다.", ["after-child-dental-treatment-care", "children-dental-trauma"]),
  ],
});
