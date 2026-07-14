import { CATEGORY_KEYWORDS } from "../admin-naver-datalab-keywords";
import type { CoverageConcept, CoverageCriterion, CoverageTopicSpec, ContentSurface } from "./types";

const PRIMARY: ContentSurface[] = ["blog", "treatment-page", "faq"];
const CONTENT_ACTIONS = ["create-blog", "update-blog", "update-treatment-page", "add-faq", "update-faq", "promote-faq-to-page", "refresh-content", "resolve-conflict", "clinical-review", "no-action"] as const;

function criterion(
  id: string,
  label: string,
  description: string,
  weight: number,
  importance: CoverageCriterion["importance"] = "required",
  acceptableSurfaces: ContentSurface[] = PRIMARY,
): CoverageCriterion {
  return { id, label, description, weight, importance, acceptableEvidenceRoles: ["primary", "supporting"], acceptableSurfaces };
}

function concept(
  id: string,
  label: string,
  description: string,
  weight: number,
  criteria: CoverageCriterion[],
  options: { importance?: CoverageConcept["importance"]; identityPhrases: string[]; contextPhrases?: string[] },
): CoverageConcept {
  return {
    id,
    label,
    description,
    weight,
    importance: options.importance ?? "required",
    criteria,
    retrievalHints: { identityPhrases: options.identityPhrases, contextPhrases: options.contextPhrases },
  };
}

export const COVERAGE_TOPIC_SPECS: CoverageTopicSpec[] = [
  {
    id: "orthodontics-pain-risks",
    searchTopicKey: "orthodontics:통증/부작용",
    label: "교정 통증과 부작용",
    description: "교정치료 중 발생하는 정상적인 통증과 장치 불편, 주요 부작용, 위험 신호 및 대처 방법",
    userQuestions: ["교정 후 통증은 며칠 동안 정상인가요?", "장치가 입안을 찌르면 어떻게 해야 하나요?", "어떤 증상이 생기면 치과에 연락해야 하나요?", "치근 흡수나 잇몸 퇴축은 왜 생기나요?"],
    concepts: [
      concept("normal-pain", "정상적인 초기 통증", "교정 초기의 정상 반응과 일반적인 지속 기간", 25, [
        criterion("symptoms", "정상 증상", "치아가 당기거나 씹을 때 불편한 정상 반응을 설명한다.", 45),
        criterion("duration", "지속 기간", "일반적인 통증 지속 기간을 설명한다.", 35),
        criterion("management", "초기 관리", "식사와 생활 관리 방법을 설명한다.", 20, "recommended"),
      ], { identityPhrases: ["교정 통증", "교정 후 통증", "교정 초기", "치아 이동 통증"] }),
      concept("device-irritation", "장치로 인한 불편", "브라켓과 철사로 인한 상처 및 대처", 15, [
        criterion("symptoms", "장치 자극", "입안 상처와 자극 증상을 설명한다.", 50),
        criterion("management", "임시 대처", "교정용 왁스 등 임시 대처 방법을 설명한다.", 50),
      ], { identityPhrases: ["교정용 왁스", "장치가 찌르", "철사가 찌르", "장치로 인한 상처", "브라켓 상처", "장치 자극", "장치 불편"] }),
      concept("root-resorption", "치근 흡수", "치근 흡수 가능성과 검사·관리 필요성", 20, [
        criterion("risk", "발생 가능성", "교정 중 치근 흡수 가능성을 설명한다.", 40),
        criterion("monitoring", "검사와 관리", "검사와 경과 관찰 필요성을 설명한다.", 60),
      ], { identityPhrases: ["치근 흡수", "치아 뿌리 흡수"], contextPhrases: ["교정", "치아 이동", "교정력"] }),
      concept("gum-recession", "잇몸 퇴축", "교정 중 잇몸 퇴축의 위험과 관련 요인", 15, [
        criterion("risk", "잇몸 퇴축 위험", "잇몸 퇴축 가능성과 관련 요인을 설명한다.", 60),
        criterion("prevention", "예방과 관리", "위생 관리와 치주 상태 확인을 설명한다.", 40),
      ], { identityPhrases: ["잇몸 퇴축", "치은 퇴축", "잇몸 내려앉"], contextPhrases: ["교정", "치아 이동", "교정력"] }),
      concept("warning-signs", "위험 신호", "정상 불편과 치과 확인이 필요한 증상의 구분", 25, [
        criterion("red-flags", "확인이 필요한 증상", "심한 통증, 지속 증상 등 확인이 필요한 상황을 설명한다.", 60),
        criterion("contact", "내원 기준", "치과에 연락하거나 내원해야 할 기준을 설명한다.", 40),
      ], { identityPhrases: ["심한 통증", "지속되는 통증", "장치 탈락", "장치가 탈락", "심한 출혈", "심한 붓기"], contextPhrases: ["교정", "브라켓", "철사", "교정 장치"] }),
    ],
    exclusions: ["교정과 관계없는 일반 치통", "혀 질환", "불소 치료 후 증상", "턱관절 질환"],
    retrievalExclusionPhrases: ["일반 치통", "혀 질환", "불소 치료", "턱관절"],
    applicableSurfaces: PRIMARY,
    actionPolicy: { primarySurface: "treatment-page", supportingSurfaces: ["blog", "faq"], allowedActions: [...CONTENT_ACTIONS], requiresPageFoundation: true },
    reviewPolicy: { requiresClinicalReview: true, reviewNote: "부작용과 내원 위험 신호는 의료진 검토가 필요함" },
    version: 1,
  },
  {
    id: "dental-cost-insurance",
    searchTopicKey: "dental-choice:비용/보험",
    label: "치과 비용과 보험",
    description: "치과 치료비가 달라지는 이유, 건강보험·실손보험 적용 범위, 추가 비용과 상담 전 확인사항",
    userQuestions: ["치과 치료비는 왜 병원마다 다른가요?", "건강보험이 적용되는 치료는 무엇인가요?", "실손보험 청구가 가능한가요?", "상담 전에 어떤 비용을 확인해야 하나요?"],
    concepts: [
      concept("cost-structure", "치료비 구성", "진단, 재료, 난이도와 치료 범위에 따른 비용 차이", 25, [
        criterion("drivers", "비용 결정 요인", "재료와 치료 범위 등 비용 결정 요인을 설명한다.", 60),
        criterion("individual-variation", "개인별 차이", "검사 결과와 상태에 따라 비용이 달라짐을 설명한다.", 40),
      ], { identityPhrases: ["치료비", "진료비", "치과 비용", "비용 차이", "가격 차이"], contextPhrases: ["재료", "범위", "난이도", "검사", "상태", "달라"] }),
      concept("national-insurance", "건강보험", "건강보험 적용 대상과 본인부담 기준", 30, [
        criterion("eligibility", "적용 대상", "건강보험 적용 대상과 조건을 설명한다.", 55),
        criterion("limits", "적용 범위", "보장 범위와 제한을 설명한다.", 45),
      ], { identityPhrases: ["건강보험", "보험 적용", "본인부담"] }),
      concept("private-insurance", "실손·민간보험", "실손보험 청구 가능성과 확인 절차", 20, [
        criterion("coverage", "보장 가능성", "상품과 치료에 따라 보장이 달라짐을 설명한다.", 50),
        criterion("verification", "보험사 확인", "약관과 보험사 확인 필요성을 설명한다.", 50),
      ], { identityPhrases: ["실손보험", "실비보험", "민간보험", "보험사", "보험 약관"] }),
      concept("estimate", "상담과 견적", "검사 후 총비용과 추가 가능성을 확인하는 방법", 25, [
        criterion("exam-first", "검사 후 안내", "정확한 비용은 검사 후 안내됨을 설명한다.", 45),
        criterion("additional-costs", "추가 비용", "추가 시술과 재료 비용 가능성을 설명한다.", 30),
        criterion("questions", "확인 항목", "상담에서 확인할 비용 항목을 안내한다.", 25, "recommended"),
      ], { identityPhrases: ["총비용", "치료 비용", "치료비", "비용은", "비용 안내", "견적", "추가 비용"], contextPhrases: ["검사", "상담", "진단", "치료 계획"] }),
    ],
    exclusions: ["특정 치료의 가격만 단순 언급한 글", "치과와 무관한 보험 정보", "할인이나 이벤트 중심 홍보"],
    retrievalExclusionPhrases: ["가격만", "비용만", "할인", "이벤트"],
    applicableSurfaces: ["treatment-page", "faq", "blog", "about"],
    actionPolicy: { primarySurface: "faq", supportingSurfaces: ["treatment-page", "blog", "about"], allowedActions: [...CONTENT_ACTIONS], requiresPageFoundation: false },
    reviewPolicy: { requiresClinicalReview: false, reviewNote: "보험 조건과 금액은 최신성 확인이 필요함" },
    version: 1,
  },
  {
    id: "front-teeth-treatment",
    searchTopicKey: "prosthetics:앞니치료",
    label: "앞니 치료",
    description: "깨짐·변색·결손 등 앞니 문제의 진단, 치료 선택지, 적합 조건, 심미성과 회복 과정",
    userQuestions: ["앞니가 깨지면 어떤 치료를 하나요?", "라미네이트·크라운·레진 중 무엇이 맞나요?", "앞니 임플란트가 필요한 경우는 언제인가요?", "치료 후 모양과 색은 자연스러운가요?"],
    concepts: [
      concept("diagnosis", "문제와 진단", "손상 원인과 치아 보존 가능성 평가", 20, [criterion("problem-types", "문제 유형", "깨짐, 변색, 결손 등 문제 유형을 구분한다.", 50), criterion("exam", "진단", "치아와 잇몸 상태를 검사해 치료를 정함을 설명한다.", 50)], { identityPhrases: ["앞니 깨짐", "앞니 변색", "앞니 결손", "앞니 손상", "앞니 진단", "앞니 충치", "앞니 외상"] }),
      concept("options", "치료 선택지", "레진·라미네이트·크라운·브릿지·임플란트의 역할", 30, [criterion("restorative", "보존 선택지", "레진, 라미네이트, 크라운의 차이를 설명한다.", 50), criterion("replacement", "결손 선택지", "브릿지와 임플란트 적용 상황을 설명한다.", 50)], { identityPhrases: ["레진", "라미네이트", "크라운", "브릿지", "임플란트"], contextPhrases: ["앞니", "전치부"] }),
      concept("suitability", "적합 조건", "손상 범위와 잇몸·교합에 따른 선택 기준", 20, [criterion("selection", "선택 기준", "치질, 잇몸, 교합에 따른 선택 기준을 설명한다.", 60), criterion("limits", "제한과 보존", "삭제량과 자연치아 보존을 설명한다.", 40)], { identityPhrases: ["앞니", "전치부"], contextPhrases: ["선택", "적합", "삭제", "보존", "교합"] }),
      concept("aesthetics", "심미성과 기능", "색·형태·잇몸선과 기능 회복", 15, [criterion("appearance", "색과 형태", "인접 치아와 색과 형태를 맞추는 과정을 설명한다.", 60), criterion("function", "기능", "발음과 교합 등 기능을 설명한다.", 40, "recommended")], { identityPhrases: ["앞니", "전치부"], contextPhrases: ["색조", "투명도", "치아 형태", "잇몸선", "심미", "발음", "자연스럽"] }),
      concept("recovery-cost", "기간과 비용", "치료 기간, 회복과 비용 결정 요인", 15, [criterion("timeline", "치료 기간", "치료별 기간과 내원 횟수를 설명한다.", 50), criterion("cost", "비용 요인", "재료와 치료 범위에 따른 비용 차이를 설명한다.", 50)], { identityPhrases: ["앞니", "전치부"], contextPhrases: ["치료 기간", "내원 횟수", "회복", "비용", "가격"] }),
    ],
    exclusions: ["앞니 부분교정만 다룬 글", "앞니를 예시로 한 일반 임플란트 글", "심미 홍보만 있고 치료 기준이 없는 내용"],
    retrievalExclusionPhrases: ["앞니 부분교정", "부분 교정", "정중과잉치", "심미 홍보"],
    applicableSurfaces: PRIMARY,
    actionPolicy: { primarySurface: "treatment-page", supportingSurfaces: ["blog", "faq"], allowedActions: [...CONTENT_ACTIONS], requiresPageFoundation: true },
    reviewPolicy: { requiresClinicalReview: true },
    version: 1,
  },
  {
    id: "pediatric-dental-trauma",
    searchTopicKey: "pediatric:소아응급/외상",
    label: "소아 치아 외상",
    description: "아이가 치아를 부딪히거나 깨뜨렸을 때의 즉시 대처, 응급성 판단, 치료와 경과 관찰",
    userQuestions: ["아이가 이를 부딪히면 먼저 무엇을 해야 하나요?", "유치가 빠졌을 때 다시 넣어야 하나요?", "치아가 깨지거나 흔들리면 바로 가야 하나요?", "외상 후 어떤 변화를 관찰해야 하나요?"],
    concepts: [
      concept("first-aid", "즉시 대처", "출혈·부종 관리와 치아 조각 보관 등 초기 행동", 25, [criterion("safe-actions", "안전한 초기 행동", "출혈과 부종에 대한 안전한 대처를 설명한다.", 60), criterion("preservation", "치아·조각 보관", "치아나 조각의 보관과 취급을 설명한다.", 40)], { identityPhrases: ["치아 외상", "이를 부딪", "치아를 부딪", "치아 조각", "치아가 부러", "부러진 조각"], contextPhrases: ["출혈", "부종", "보관", "대처", "응급"] }),
      concept("injury-types", "외상 유형", "깨짐, 흔들림, 탈구와 완전 탈락의 구분", 20, [criterion("classification", "외상 구분", "주요 외상 유형을 구분한다.", 60), criterion("primary-permanent", "유치·영구치 차이", "유치와 영구치의 대처 차이를 설명한다.", 40)], { identityPhrases: ["치아 외상", "치아 탈구", "치아 탈락", "치아가 깨", "치아가 흔들"], contextPhrases: ["아이", "어린이", "소아", "유치", "영구치", "외상"] }),
      concept("urgency", "응급 내원 기준", "즉시 내원이 필요한 상황과 시간 중요성", 25, [criterion("red-flags", "응급 신호", "심한 출혈, 탈락 등 응급 신호를 설명한다.", 60), criterion("timing", "내원 시점", "가능한 빠른 평가가 필요한 이유를 설명한다.", 40)], { identityPhrases: ["치아 외상", "치아 탈락", "치아 탈구", "이를 부딪", "치아를 부딪"], contextPhrases: ["즉시", "응급", "빠른", "빨리", "내원", "방문", "시간"] }),
      concept("treatment-followup", "치료와 경과 관찰", "검사·치료와 변색·통증 등 후속 관찰", 20, [criterion("evaluation", "치과 검사", "방사선 검사와 치아 상태 평가를 설명한다.", 50), criterion("followup", "경과 관찰", "변색, 통증, 잇몸 변화의 관찰을 설명한다.", 50)], { identityPhrases: ["치아 외상", "치아 탈락", "치아 탈구", "이를 부딪", "치아를 부딪"], contextPhrases: ["변색", "경과", "관찰", "방사선", "검사"] }),
      concept("prevention", "재발 예방", "운동 보호장치와 생활 안전", 10, [criterion("prevention", "예방 방법", "마우스가드와 생활 안전을 설명한다.", 100, "recommended")], { importance: "recommended", identityPhrases: ["마우스가드", "스포츠 마우스가드", "치아 외상 예방"] }),
    ],
    exclusions: ["성인 치아 외상만 다룬 글", "외상과 무관한 유치 교환", "일반적인 아이 치통"],
    retrievalExclusionPhrases: ["성인 치아 외상", "주로 성인 치아 기준", "유치 교환", "아이 치통"],
    applicableSurfaces: PRIMARY,
    actionPolicy: { primarySurface: "faq", supportingSurfaces: ["blog", "treatment-page"], allowedActions: [...CONTENT_ACTIONS], requiresPageFoundation: false },
    reviewPolicy: { requiresClinicalReview: true, reviewNote: "유치와 영구치의 응급 대처 차이는 의료진 검토가 필요함" },
    version: 1,
  },
  {
    id: "oral-hygiene",
    searchTopicKey: "prevention:구강위생",
    label: "구강위생",
    description: "올바른 칫솔질, 치실·치간칫솔 사용, 구강관리도구 선택과 정기적인 전문 관리",
    userQuestions: ["올바른 칫솔질은 어떻게 하나요?", "치실과 치간칫솔은 어떻게 다른가요?", "워터픽이나 전동칫솔이 필요한가요?", "정기검진과 스케일링은 얼마나 자주 해야 하나요?"],
    concepts: [
      concept("brushing", "칫솔질", "칫솔 선택과 올바른 칫솔질 방법", 25, [criterion("technique", "칫솔질 방법", "치아와 잇몸 경계를 닦는 방법을 설명한다.", 60), criterion("frequency", "빈도와 시간", "칫솔질 빈도와 시간을 설명한다.", 40)], { identityPhrases: ["칫솔질 방법", "양치 방법", "양치법", "칫솔을 45도", "칫솔로 닦", "하루 2", "하루 3", "최소 2분", "45도 각도"] }),
      concept("interdental", "치아 사이 관리", "치실과 치간칫솔의 역할과 사용법", 25, [criterion("floss", "치실", "치실의 사용 대상과 방법을 설명한다.", 50), criterion("interdental-brush", "치간칫솔", "치간칫솔의 선택과 사용법을 설명한다.", 50)], { identityPhrases: ["치실", "치간칫솔", "치아 사이"] }),
      concept("devices", "보조 관리도구", "전동칫솔·워터픽·구강세정제의 역할과 한계", 20, [criterion("selection", "도구 선택", "상태에 맞는 보조 도구 선택을 설명한다.", 50), criterion("limitations", "도구의 한계", "보조 도구가 기본 관리를 완전히 대체하지 않음을 설명한다.", 50)], { identityPhrases: ["전동칫솔", "워터픽", "구강세정기", "구강세정제", "구강청결제", "가글"] }),
      concept("individual-care", "상황별 관리", "교정·임플란트·잇몸 상태에 따른 관리 차이", 15, [criterion("conditions", "상태별 방법", "구강 상태와 치료에 따른 관리 차이를 설명한다.", 100, "recommended")], { importance: "recommended", identityPhrases: ["교정", "임플란트", "잇몸"], contextPhrases: ["칫솔", "치실", "치간칫솔", "구강 관리", "위생 관리"] }),
      concept("professional-care", "전문 관리", "정기검진과 스케일링의 필요성", 15, [criterion("checkup", "정기검진", "정기검진의 역할을 설명한다.", 50), criterion("scaling", "스케일링", "전문적인 치태·치석 관리 필요성을 설명한다.", 50)], { identityPhrases: ["정기검진", "스케일링", "치석 제거", "전문 관리"] }),
    ],
    exclusions: ["특정 제품 홍보만 있는 콘텐츠", "생활 위생 전반", "치과와 무관한 세정 도구"],
    retrievalExclusionPhrases: ["제품 홍보", "생활 위생", "치과와 무관한"],
    applicableSurfaces: ["blog", "treatment-page", "faq"],
    actionPolicy: { primarySurface: "blog", supportingSurfaces: ["treatment-page", "faq"], allowedActions: ["create-blog", "update-blog", "add-faq", "update-faq", "refresh-content", "resolve-conflict", "clinical-review", "no-action"], requiresPageFoundation: false },
    reviewPolicy: { requiresClinicalReview: false },
    version: 1,
  },
];

export function validateCoverageTopicSpecs(specs: CoverageTopicSpec[] = COVERAGE_TOPIC_SPECS): void {
  const ids = new Set<string>();
  const searchKeys = new Set(CATEGORY_KEYWORDS.flatMap((category) => category.subGroups.map((subGroup) => `${category.slug}:${subGroup.name}`)));
  for (const spec of specs) {
    if (ids.has(spec.id)) throw new Error(`중복된 콘텐츠 주제 명세 ID: ${spec.id}`);
    ids.add(spec.id);
    if (!searchKeys.has(spec.searchTopicKey)) throw new Error(`존재하지 않는 검색 주제 연결: ${spec.searchTopicKey}`);
    if (spec.version < 1 || !Number.isInteger(spec.version)) throw new Error(`${spec.id} 버전은 1 이상의 정수여야 합니다.`);
    if (spec.userQuestions.length === 0 || spec.concepts.length === 0) throw new Error(`${spec.id}에는 질문과 개념이 필요합니다.`);
    const conceptWeight = spec.concepts.reduce((sum, item) => sum + item.weight, 0);
    if (conceptWeight !== 100) throw new Error(`${spec.id} 개념 가중치 합계가 ${conceptWeight}입니다.`);
    const conceptIds = new Set<string>();
    for (const item of spec.concepts) {
      if (conceptIds.has(item.id)) throw new Error(`${spec.id}의 개념 ID가 중복됩니다: ${item.id}`);
      conceptIds.add(item.id);
      const criterionWeight = item.criteria.reduce((sum, entry) => sum + entry.weight, 0);
      if (criterionWeight !== 100) throw new Error(`${spec.id}/${item.id} 판정 기준 가중치 합계가 ${criterionWeight}입니다.`);
      if (new Set(item.criteria.map((entry) => entry.id)).size !== item.criteria.length) throw new Error(`${spec.id}/${item.id} 판정 기준 ID가 중복됩니다.`);
      if (!item.retrievalHints || item.retrievalHints.identityPhrases.length === 0) throw new Error(`${spec.id}/${item.id} 검색 식별 표현이 없습니다.`);
    }
    if (!spec.retrievalExclusionPhrases || spec.retrievalExclusionPhrases.length === 0) throw new Error(`${spec.id} 검색 제외 표현이 없습니다.`);
    if (!spec.applicableSurfaces.includes(spec.actionPolicy.primarySurface)) throw new Error(`${spec.id}의 기본 표면이 평가 범위에 없습니다.`);
  }
}

validateCoverageTopicSpecs();
