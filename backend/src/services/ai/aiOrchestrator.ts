import { config } from '../../config/env.js';
import {
  DuplicateComplaintInput,
  AIOrchestrationResult,
  DuplicateAssessmentSummary,
  PriorityAssessmentSummary,
} from './aiSchemas.js';
import {
  duplicateServiceClient,
  DuplicateServiceClient,
} from './duplicateClient.js';
import {
  priorityServiceClient,
  PriorityServiceClient,
} from './priorityClient.js';

export interface AssessComplaintInput {
  id: string;
  title: string;
  description: string;
  category: 'POTHOLES' | 'STREET_LIGHTS' | 'GARBAGE' | 'DISASTERS';
  disasterType?: 'FIRE' | 'FLOOD' | 'OTHER' | null;
  latitude: number;
  longitude: number;
}

export class AIOrchestrator {
  constructor(
    private readonly duplicateClient: DuplicateServiceClient = duplicateServiceClient,
    private readonly priorityClient: PriorityServiceClient = priorityServiceClient,
    private readonly isEnabled: boolean = config.AI_INTEGRATION_ENABLED
  ) {}

  /**
   * Orchestrates duplicate detection and priority scoring concurrently.
   * Provides resilient fallback if either service fails or times out.
   */
  public async assessComplaint(
    target: AssessComplaintInput,
    candidates: DuplicateComplaintInput[],
    userRole: 'CITIZEN' | 'ADMIN' = 'CITIZEN'
  ): Promise<AIOrchestrationResult> {
    if (!this.isEnabled) {
      return {
        duplicate_check: {
          status: 'skipped',
          citizen_advisory: 'AI evaluation skipped (disabled by server configuration).',
        },
        priority_assessment: {
          status: 'skipped',
          explanation: 'AI evaluation skipped (disabled by server configuration).',
        },
      };
    }

    // Run duplicate evaluation and priority assessment in parallel
    const [duplicateSettled, prioritySettled] = await Promise.allSettled([
      this.duplicateClient.evaluateDuplicates({
        target_complaint: {
          id: target.id,
          title: target.title,
          description: target.description,
          category: target.category,
          disaster_type: target.disasterType ?? null,
          latitude: target.latitude,
          longitude: target.longitude,
        },
        candidate_pool: candidates,
      }),
      this.priorityClient.assessPriority({
        complaint_id: target.id,
        primary_category: target.category,
        disaster_type: target.disasterType ?? null,
        title: target.title,
        description: target.description,
        latitude: target.latitude,
        longitude: target.longitude,
      }),
    ]);

    // Format Duplicate Result with Role-Based Privacy
    let duplicateSummary: DuplicateAssessmentSummary;
    if (duplicateSettled.status === 'fulfilled') {
      const dupRes = duplicateSettled.value;
      const topMatch = dupRes.top_match ?? null;
      const isLikely = topMatch
        ? topMatch.recommendation === 'LIKELY_DUPLICATE' || topMatch.combined_score >= 0.75
        : false;
      const hasPotential = topMatch
        ? isLikely || topMatch.recommendation === 'POSSIBLE_DUPLICATE' || topMatch.combined_score >= 0.5
        : false;

      const parentCandidateId = hasPotential && topMatch?.candidate_id ? topMatch.candidate_id : null;

      let citizenAdvisory = 'No similar complaints detected in your immediate vicinity.';
      if (topMatch && isLikely) {
        citizenAdvisory = 'A very similar report has already been submitted nearby and is being reviewed.';
      } else if (topMatch && hasPotential) {
        citizenAdvisory = 'A potentially related issue was recently reported in this area.';
      }

      duplicateSummary = {
        status: 'completed',
        candidates_evaluated: dupRes.candidates_evaluated,
        matches_count: dupRes.matches.length,
        has_potential_duplicate: hasPotential,
        parent_candidate_id: parentCandidateId,
        top_match: userRole === 'ADMIN' ? topMatch : (hasPotential ? { ...topMatch!, candidate_id: '[PROTECTED]' } : null),
        matches: userRole === 'ADMIN' ? dupRes.matches : undefined,
        citizen_advisory: citizenAdvisory,
      };
    } else {
      duplicateSummary = {
        status: 'failed',
        error: duplicateSettled.reason?.message || 'Duplicate detection service unavailable',
        citizen_advisory: 'Duplicate verification temporarily unavailable.',
      };
    }

    // Format Priority Result with Role-Based Privacy
    let prioritySummary: PriorityAssessmentSummary;
    if (prioritySettled.status === 'fulfilled') {
      const prioRes = prioritySettled.value;
      prioritySummary = {
        status: 'completed',
        severity_score: prioRes.severity_score,
        priority_level: prioRes.priority_level,
        safety_override_applied: prioRes.safety_override_applied,
        safety_reasons: prioRes.safety_reasons,
        explanation: prioRes.explanation,
        detected_indicators: userRole === 'ADMIN' ? prioRes.detected_indicators : undefined,
        score_breakdown: userRole === 'ADMIN' ? prioRes.score_breakdown : undefined,
      };
    } else {
      prioritySummary = {
        status: 'failed',
        error: prioritySettled.reason?.message || 'Priority assessment service unavailable',
        explanation: 'Priority assessment temporarily unavailable; queued for standard manual triage.',
      };
    }

    return {
      duplicate_check: duplicateSummary,
      priority_assessment: prioritySummary,
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();

