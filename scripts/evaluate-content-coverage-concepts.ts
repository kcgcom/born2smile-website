import conceptReviewBaselineJson from "../lib/content-coverage/generated/concept-review-baseline.json";
import conceptReviewSeedJson from "../lib/content-coverage/generated/concept-review-seed.json";
import {
  applyConceptReviewBaseline,
  evaluateConceptReview,
  type ConceptReviewBaseline,
  type ConceptReviewSeed,
} from "../lib/content-coverage/concept-review";
import { COVERAGE_TOPIC_SPECS } from "../lib/content-coverage/topic-specs";

const review = applyConceptReviewBaseline(
  conceptReviewSeedJson as unknown as ConceptReviewSeed,
  conceptReviewBaselineJson as unknown as ConceptReviewBaseline,
);

console.log(JSON.stringify(evaluateConceptReview(COVERAGE_TOPIC_SPECS, review), null, 2));
