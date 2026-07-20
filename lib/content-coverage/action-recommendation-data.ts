import { buildActionRecommendations } from "./action-recommendation";
import { buildActionValueInputs, getCurrentActionValueSignalSnapshot } from "./action-value";
import { getOperationalConceptReviewSnapshot } from "./concept-review-store";
import { assessConceptSatisfaction, type ConceptSearchResolution } from "./concept-satisfaction";
import conceptSearchResolutionJson from "./generated/concept-search-resolution.json";
import { COVERAGE_TOPIC_SPECS } from "./topic-specs";
import { buildTopicExpansionReport } from "./topic-expansion";

export async function getCurrentActionRecommendationReport() {
  const [operational, valueSnapshot] = await Promise.all([
    getOperationalConceptReviewSnapshot(),
    getCurrentActionValueSignalSnapshot(),
  ]);
  const satisfaction = assessConceptSatisfaction(
    COVERAGE_TOPIC_SPECS,
    operational.review,
    conceptSearchResolutionJson as ConceptSearchResolution,
  );
  return {
    ...buildActionRecommendations(COVERAGE_TOPIC_SPECS, satisfaction, operational.input, buildActionValueInputs(valueSnapshot, COVERAGE_TOPIC_SPECS)),
    topicExpansion: buildTopicExpansionReport(valueSnapshot, COVERAGE_TOPIC_SPECS),
  };
}
