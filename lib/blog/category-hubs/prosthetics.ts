import { defineCategoryHub, question, section } from "./shared";

export const prostheticsHub = defineCategoryHub({
  heroTitle: "보철치료 정보 허브",
  heroDescription: "크라운, 브릿지, 틀니, 심미보철의 차이와 적응 기간, 재치료 신호까지 보철치료의 핵심 의사결정을 모아봤습니다.",
  intro: "어떤 보철이 내 상황에 맞는지 비교 기준과, 치료 후 불편할 때 확인할 포인트를 중심으로 모았습니다.",
  audience: [
    "크라운·브릿지·틀니·임플란트 차이를 먼저 정리하고 싶은 분",
    "보철 재료와 관리법이 결과에 어떤 영향을 주는지 알고 싶은 분",
    "보철 치료 후 적응이 잘 안 되거나 재치료 신호가 걱정되는 분",
  ],
  questions: [
    question("틀니와 임플란트는 어떤 차이로 선택하나요?", "denture-vs-implant", "남아 있는 치아 상태와 잇몸뼈, 예산, 관리 가능성에 따라 더 적합한 선택이 달라집니다."),
    question("크라운 재료는 무엇을 기준으로 고르면 좋을까요?", "crown-material-comparison", "심미뿐 아니라 위치, 씹는 힘, 반대편 치아 상태까지 함께 봐야 장기 결과가 좋아집니다."),
    question("틀니가 아프거나 헐거울 때는 어떻게 해야 하나요?", "denture-adjustment-guide", "새 보철은 적응 기간이 필요하지만 통증이 심하거나 씹기 어려우면 조정이 필요한 신호일 수 있습니다."),
    question("보철 후 이물감은 얼마나 가나요?", "prosthetic-adjustment-period-guide", "새 보철에 적응하는 데 시간이 필요하지만 통증이 심하거나 발음·저작이 계속 불편하면 진료실 조정이 필요합니다."),
  ],
  sections: [
    section("무엇을 선택할지 비교", "대표적인 보철 옵션의 차이를 먼저 비교해 보세요.", ["denture-vs-implant", "laminate-veneer-guide", "crown-material-comparison"]),
    section("치료 후 적응과 관리", "보철이 자리 잡는 과정에서 자주 겪는 불편과 관리법입니다.", ["denture-adjustment-guide", "denture-care-tips", "after-crown-prosthetic-care"]),
    section("심미와 장기 사용", "심미 보철과 장기 유지관리 관점에서 읽어보세요.", ["laminate-veneer-guide", "denture-care-tips"]),
  ],
});
