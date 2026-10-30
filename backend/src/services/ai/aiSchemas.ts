import { z } from 'zod';

// ============================================================================
// Sprint 5: Duplicate Detection Service Schemas
// ============================================================================

export const duplicateComplaintInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(['POTHOLES', 'STREET_LIGHTS', 'GARBAGE', 'DISASTERS']),
  disaster_type: z.enum(['FIRE', 'FLOOD', 'OTHER']).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type DuplicateComplaintInput = z.infer<typeof duplicateComplaintInputSchema>;

export const duplicateEvaluateRequestSchema = z.object({
  target_complaint: duplicateComplaintInputSchema,
  candidate_pool: z.array(duplicateComplaintInputSchema).max(100),
  max_distance_meters: z.number().positive().optional(),
});

export type DuplicateEvaluateRequest = z.infer<typeof duplicateEvaluateRequestSchema>;

export const duplicateMatchItemSchema = z.object({
  candidate_id: z.string(),
  combined_score: z.number().min(0).max(1),
  recommendation: z.enum(['LIKELY_DUPLICATE', 'POSSIBLE_DUPLICATE', 'UNLIKELY_DUPLICATE']),
  distance_meters: z.number().min(0),
  geo_score: z.number().min(0).max(1),
  lexical_score: z.number().min(0).max(1),
  semantic_score: z.number().min(0).max(1),
  reason_codes: z.array(z.string()).default([]),
  explanation: z.string(),
});

export type DuplicateMatchItem = z.infer<typeof duplicateMatchItemSchema>;

export const duplicateEvaluateResponseSchema = z.object({
  target_id: z.string(),
  candidates_evaluated: z.number().int().min(0),
  matches: z.array(duplicateMatchItemSchema),
  top_match: duplicateMatchItemSchema.nullable().optional(),
});

export type DuplicateEvaluateResponse = z.infer<typeof duplicateEvaluateResponseSchema>;

// ============================================================================
// Sprint 6: Priority Assessment Service Schemas
// ============================================================================

export const priorityAssessRequestSchema = z.object({
  complaint_id: z.string().optional(),
  primary_category: z.enum(['POTHOLES', 'STREET_LIGHTS', 'GARBAGE', 'DISASTERS']),
  disaster_type: z.enum(['FIRE', 'FLOOD', 'OTHER']).nullable().optional(),
  title: z.string().default(''),
  description: z.string().default(''),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type PriorityAssessRequest = z.infer<typeof priorityAssessRequestSchema>;

export const detectedIndicatorSchema = z.object({
  dimension: z.string(),
  matched_phrase: z.string(),
  severity_contribution: z.number(),
  is_negated: z.boolean().default(false),
  context_snippet: z.string().nullable().optional(),
});

export type DetectedIndicator = z.infer<typeof detectedIndicatorSchema>;

export const scoreBreakdownSchema = z.object({
  base_category_score: z.number(),
  safety_hazards_contribution: z.number(),
  public_impact_contribution: z.number(),
  damage_extent_contribution: z.number(),
  urgency_contribution: z.number(),
  raw_score: z.number(),
  final_score: z.number(),
});

export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const priorityAssessResponseSchema = z.object({
  complaint_id: z.string().nullable().optional(),
  severity_score: z.number().min(0).max(100),
  priority_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  safety_override_applied: z.boolean().default(false),
  safety_reasons: z.array(z.string()).default([]),
  human_review_recommended: z.boolean().default(true),
  detected_indicators: z.array(detectedIndicatorSchema).default([]),
  score_breakdown: scoreBreakdownSchema,
  assessment_method: z.string().default('RULE_BASED_BASELINE'),
  rule_version: z.string().default('rules-v1.0.0'),
  explanation: z.string(),
  limitations: z.string().optional(),
});

export type PriorityAssessResponse = z.infer<typeof priorityAssessResponseSchema>;

// ============================================================================
// Unified AI Orchestrator Result Schemas
// ============================================================================

export type AssessmentStatus = 'completed' | 'failed' | 'skipped';

export interface DuplicateAssessmentSummary {
  status: AssessmentStatus;
  candidates_evaluated?: number;
  matches_count?: number;
  has_potential_duplicate?: boolean;
  parent_candidate_id?: string | null;
  top_match?: DuplicateMatchItem | null;
  matches?: DuplicateMatchItem[]; // Included only for ADMIN role
  citizen_advisory?: string; // Safe, neutral citizen message
  error?: string;
}

export interface PriorityAssessmentSummary {
  status: AssessmentStatus;
  severity_score?: number;
  priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safety_override_applied?: boolean;
  safety_reasons?: string[];
  explanation?: string;
  detected_indicators?: DetectedIndicator[]; // Included only for ADMIN role
  score_breakdown?: ScoreBreakdown; // Included only for ADMIN role
  error?: string;
}

export interface AIOrchestrationResult {
  duplicate_check: DuplicateAssessmentSummary;
  priority_assessment: PriorityAssessmentSummary;
}

