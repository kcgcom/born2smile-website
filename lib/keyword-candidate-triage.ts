import { isRelevantRelatedKeyword } from "./admin-naver-datalab-keywords";

export type CandidateTriageKind = "approve-suggested" | "defer-suggested" | "exclude-suggested" | "reclassify" | "review";

export interface CandidateTriageInput {
  keyword: string;
  monthlyVolume: number;
  seenCount: number;
  seenInLatestSnapshot: boolean;
  subgroupExists: boolean;
}

export interface CandidateTriage {
  kind: CandidateTriageKind;
  decision: "approve" | "defer" | "reject" | null;
  reason: string;
}

const PRODUCT_OR_BRAND_PATTERN =
  /추천|치약|칫솔|칫솔모|세정제|세척기|제거제|사탕|영양제|케이스|오랄비|워터픽|아쿠아픽|오아구강|화이트랩스|crest/i;
const DENTAL_TREATMENT_PATTERN =
  /치과|치아|충치|신경치료|크라운|임플란트|교정|잇몸|치주|구강|스케일링|라미네이트|틀니|인레이|사랑니|뼈이식|상악동/;
const OBVIOUS_FALSE_POSITIVE_PATTERN =
  /팔꿈치|엉치통증|에어플로우센서|지르코니아볼|도요다크라운|해슬리나인브릿지/;

export function triageKeywordCandidate(input: CandidateTriageInput): CandidateTriage {
  if (!input.subgroupExists) {
    return { kind: "reclassify", decision: null, reason: "현재 택소노미에 추천 서브그룹이 없어 적용 위치를 다시 정해야 합니다." };
  }
  if (OBVIOUS_FALSE_POSITIVE_PATTERN.test(input.keyword) || !isRelevantRelatedKeyword(input.keyword)) {
    return { kind: "exclude-suggested", decision: "reject", reason: "치과 검색 의도와 무관하거나 지역 정책에 맞지 않을 가능성이 높습니다." };
  }
  if (!input.seenInLatestSnapshot) {
    return { kind: "defer-suggested", decision: "defer", reason: "최신 검색 스냅샷에서 다시 발견되지 않아 추이를 더 확인하는 편이 안전합니다." };
  }
  if (PRODUCT_OR_BRAND_PATTERN.test(input.keyword)) {
    return { kind: "defer-suggested", decision: "defer", reason: "제품·브랜드 탐색 의도가 강해 핵심 키워드보다 콘텐츠 후보로 검토하는 편이 적합합니다." };
  }
  if (input.seenCount >= 3 && input.monthlyVolume >= 1_000 && DENTAL_TREATMENT_PATTERN.test(input.keyword)) {
    return { kind: "approve-suggested", decision: "approve", reason: "반복 관측되고 검색량과 치과 진료 관련성이 모두 높은 후보입니다." };
  }
  return { kind: "review", decision: null, reason: "자동 판단 근거가 충분하지 않아 직접 검토가 필요합니다." };
}
