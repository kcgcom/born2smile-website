import { buildActionRecommendations } from "./action-recommendation";
import { getCurrentActionValueInputs } from "./action-value";
import { getOperationalConceptReviewSnapshot } from "./concept-review-store";
import { assessConceptSatisfaction, type ConceptSearchResolution } from "./concept-satisfaction";
import conceptSearchResolutionJson from "./generated/concept-search-resolution.json";
import { COVERAGE_TOPIC_SPECS } from "./topic-specs";

export async function getCurrentActionRecommendationReport() {
  const [operational, valueInputs] = await Promise.all([
    getOperationalConceptReviewSnapshot(),
    getCurrentActionValueInputs(COVERAGE_TOPIC_SPECS),
  ]);
  const satisfaction = assessConceptSatisfaction(
    COVERAGE_TOPIC_SPECS,
    operational.review,
    conceptSearchResolutionJson as ConceptSearchResolution,
  );
  return buildActionRecommendations(COVERAGE_TOPIC_SPECS, satisfaction, operational.input, valueInputs);
}
