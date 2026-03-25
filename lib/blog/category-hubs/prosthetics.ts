import { defineCategoryHub, question, section } from "./shared";

export const prostheticsHub = defineCategoryHub({
  heroTitle: "보철치료 정보 허브",
  heroDescription: "크라운, 브릿지, 틀니, 심미보철의 차이와 적응 기간, 재치료 신호까지 보철치료의 핵심 의사결정을 모아봤습니다.",
  intro: "보철치료는 씹는 기능과 심미를 동시에 고려해야 해서 선택지가 많아 보일 수 있습니다. 어떤 보철이 내 상황에 맞는지, 치료 후 불편하면 무엇을 확인해야 하는지 중심으로 읽을 수 있게 묶었습니다.",
  audience: [
    "크라운·브릿지·틀니·임플란트 차이를 먼저 정리하고 싶은 분",
    "보철 재료와 관리법이 결과에 어떤 영향을 주는지 알고 싶은 분",
    "보철 치료 후 적응이 잘 안 되거나 재치료 신호가 걱정되는 분",
  ],
  questions: [
    question("틀니와 임플란트는 어떤 차이로 선택하나요?", "denture-vs-implant"),
    question("크라운 재료는 무엇을 기준으로 고르면 좋을까요?", "crown-material-comparison"),
    question("틀니가 아프거나 헐거울 때는 어떻게 해야 하나요?", "denture-adjustment-guide"),
  ],
  featuredSlugs: ["denture-vs-implant", "crown-material-comparison", "denture-adjustment-guide"],
  sections: [
    section("무엇을 선택할지 비교", "대표적인 보철 옵션의 차이를 먼저 비교해 보세요.", ["denture-vs-implant", "laminate-veneer-guide", "crown-material-comparison"]),
    section("치료 후 적응과 관리", "보철이 자리 잡는 과정에서 자주 겪는 불편과 관리법입니다.", ["denture-adjustment-guide", "denture-care-tips", "after-crown-prosthetic-care"]),
    section("심미와 장기 사용", "심미 보철과 장기 유지관리 관점에서 읽어보세요.", ["laminate-veneer-guide", "denture-care-tips"]),
  ],
  faq: [
    { q: "틀니와 임플란트 중 무엇이 더 좋다고 단정할 수 있나요?", a: "정답이 하나로 정해지지는 않습니다. 남아 있는 치아 상태, 잇몸뼈, 예산, 관리 가능성에 따라 적합한 선택이 달라집니다." },
    { q: "보철 후 이물감은 얼마나 가나요?", a: "새 보철에 적응하는 데는 시간이 필요합니다. 통증이 심하거나 씹기 어려운 정도가 계속되면 조정이 필요할 수 있습니다." },
    { q: "크라운 재료는 심미만 보고 고르면 되나요?", a: "아닙니다. 씹는 힘, 위치, 반대편 치아 상태, 심미 요구도를 함께 고려해야 결과와 유지관리 측면에서 더 유리합니다." },
  ],
});
