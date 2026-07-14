import { buildActionRecommendations } from "./action-recommendation";
import { applyConceptReviewBaseline, type ConceptReviewBaseline, type ConceptReviewSeed } from "./concept-review";
import { assessConceptSatisfaction, type ConceptSearchResolution } from "./concept-satisfaction";
import conceptReviewBaselineJson from "./generated/concept-review-baseline.json";
import conceptReviewSeedJson from "./generated/concept-review-seed.json";
import conceptSearchResolutionJson from "./generated/concept-search-resolution.json";
import { COVERAGE_TOPIC_SPECS } from "./topic-specs";

export function getCurrentActionRecommendationReport() {
  const reviewed = applyConceptReviewBaseline(
    conceptReviewSeedJson as unknown as ConceptReviewSeed,
    conceptReviewBaselineJson as unknown as ConceptReviewBaseline,
  );
  const satisfaction = assessConceptSatisfaction(
    COVERAGE_TOPIC_SPECS,
    reviewed,
    conceptSearchResolutionJson as ConceptSearchResolution,
  );
  return buildActionRecommendations(COVERAGE_TOPIC_SPECS, satisfaction);
}
