import type { KeywordCategorySlug } from "../admin-naver-datalab-keywords";

export const CONTENT_COVERAGE_ENGINE_VERSION = "coverage-v2.0" as const;
export const EVIDENCE_SCHEMA_VERSION = "evidence-v1" as const;

export type ContentSurface = "blog" | "treatment-page" | "faq" | "about" | "contact" | "home";
export type EvidenceRole = "primary" | "supporting" | "promotional" | "navigation";
export type EvidenceUnitKind = "summary" | "section" | "paragraph" | "list" | "table" | "faq" | "process-step" | "highlight" | "profile" | "logistics";
export type PlacementRegion = "main" | "summary" | "faq-section" | "sidebar" | "footer" | "cta";

export interface CoverageCriterion {
  id: string;
  label: string;
  description: string;
  importance: "required" | "recommended";
  weight: number;
  acceptableEvidenceRoles: EvidenceRole[];
  acceptableSurfaces?: ContentSurface[];
}

export interface CoverageConcept {
  id: string;
  label: string;
  description: string;
  importance: "required" | "recommended";
  weight: number;
  criteria: CoverageCriterion[];
  retrievalHints?: {
    identityPhrases: string[];
    contextPhrases?: string[];
  };
  reviewPolicy?: {
    requiresClinicalReview: boolean;
    reasons: string[];
  };
}

export type ContentActionType = "create-blog" | "update-blog" | "update-treatment-page" | "add-faq" | "update-faq" | "promote-faq-to-page" | "refresh-content" | "resolve-conflict" | "clinical-review" | "no-action";

export interface TopicActionPolicy {
  primarySurface: ContentSurface;
  supportingSurfaces: ContentSurface[];
  allowedActions: ContentActionType[];
  requiresPageFoundation: boolean;
  criterionRouting?: Record<string, {
    preferredSurface: ContentSurface;
    fallbackSurfaces: ContentSurface[];
  }>;
}

export interface CoverageTopicSpec {
  id: string;
  searchTopicKey: `${KeywordCategorySlug}:${string}`;
  label: string;
  description: string;
  userQuestions: string[];
  concepts: CoverageConcept[];
  exclusions: string[];
  retrievalExclusionPhrases?: string[];
  applicableSurfaces: ContentSurface[];
  actionPolicy: TopicActionPolicy;
  reviewPolicy: {
    requiresClinicalReview: boolean;
    reviewNote?: string;
  };
  version: number;
}

export type ContentSourceType = "blog-post" | "treatment" | "static-page" | "site-config";

export type EvidenceFragment =
  | { source: "blog-block"; blockStart: number; blockEnd: number }
  | { source: "treatment-field"; treatmentId: string; fieldPath: string }
  | { source: "static-page-section"; pageId: string; sectionId: string }
  | { source: "site-config-field"; fieldPath: string };

export interface ContentPlacement {
  surface: ContentSurface;
  region: PlacementRegion;
  path: string;
  anchor?: string;
  visible: boolean;
  indexable: boolean;
}

export interface EvidenceUnit {
  id: string;
  documentId: string;
  kind: EvidenceUnitKind;
  role: EvidenceRole;
  headingPath: string[];
  text: string;
  fragments: EvidenceFragment[];
  placements: ContentPlacement[];
  references: Array<{ url: string; label: string; publisher?: string; accessedAt?: string }>;
  order: number;
  contentHash: string;
}

export interface ContentDocument {
  id: string;
  sourceType: ContentSourceType;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  status: "published" | "draft" | "archived";
  language: "ko";
  publishedAt?: string;
  modifiedAt?: string;
  reviewedAt?: string;
  reviewStatus: "reviewed" | "unreviewed" | "review-expired" | "not-required";
  revision: string;
  units: EvidenceUnit[];
}

export type CriterionCoverageStatus = "satisfied" | "partial" | "missing" | "conflicting" | "needs-review" | "not-evaluated";
export type ConceptCoverageStatus = "covered" | "partial" | "missing" | "conflicting" | "needs-review" | "not-evaluated";

export interface AssessmentConfidence {
  level: "high" | "medium" | "low";
  factors: string[];
}

export interface CriterionCoverageResult {
  criterionId: string;
  status: CriterionCoverageStatus;
  supportingEvidenceIds: string[];
  partialEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  confidence: AssessmentConfidence;
  reasons: string[];
  assessmentVersion: string;
}

export interface ConceptCoverageResult {
  topicSpecId: string;
  conceptId: string;
  status: ConceptCoverageStatus;
  coverageScore: number | null;
  criteria: CriterionCoverageResult[];
  confidence: AssessmentConfidence;
  missingCriteria: string[];
  summary: string;
  topicSpecVersion: number;
  contentRevision: string;
  assessmentVersion: string;
}

export interface ActionRecommendation {
  actionKey: string;
  topicSpecId: string;
  title: string;
  actionType: ContentActionType;
  targetPath: string;
  why: string;
  missingConcepts: string[];
  currentEvidenceSummary: string;
  valueScore: number | null;
  confidence: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  urgency: "critical" | "high" | "normal" | "low";
  blockedBy: Array<{ actionKey: string; type: "must-complete-before" | "should-complete-before" | "reassess-after"; reason: string }>;
  reassessAfterCompletion: boolean;
}

export interface EvidenceSnapshot {
  schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  generatedAt: string;
  documents: ContentDocument[];
  stats: {
    documentCount: number;
    evidenceUnitCount: number;
    duplicatePlacementCount: number;
  };
}
