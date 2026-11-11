import { Prisma, ComplaintStatus } from '@prisma/client';
import { prisma } from '../repositories/prisma.js';
import {
  complaintRepository,
  IComplaintRepository,
} from '../repositories/complaintRepository.js';
import {
  ComplaintDetailDto,
  ComplaintListResult,
  CreateComplaintInput,
  CheckDuplicateInput,
  DuplicateCheckResultDto,
  DuplicateMatchItem,
  UpdateComplaintStatusInput,
} from '../types/complaint.js';
import { AuthenticatedUser } from '../types/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateStatusTransition } from './statusTransitionPolicy.js';
import { ListComplaintsQuery } from '../validators/complaintValidators.js';
import { aiOrchestrator, AIOrchestrator } from './ai/aiOrchestrator.js';
import { duplicateServiceClient, DuplicateServiceClient } from './ai/duplicateClient.js';
import { DuplicateComplaintInput } from './ai/aiSchemas.js';

export class ComplaintService {
  constructor(
    private repo: IComplaintRepository = complaintRepository,
    private orchestrator: AIOrchestrator = aiOrchestrator,
    private duplicateClient: DuplicateServiceClient = duplicateServiceClient
  ) {}

  /**
   * Submits a new civic complaint with initial SUBMITTED status and creates initial status history.
   * Runs resilient AI duplicate detection and priority assessment.
   */
  public async createComplaint(
    currentUser: AuthenticatedUser,
    input: CreateComplaintInput
  ): Promise<ComplaintDetailDto> {
    // Creator is always strictly bound to verified authenticated user
    const citizenId = currentUser.id;

    // 1. Retrieve candidate complaints for duplicate checking (privacy-safe, bounded)
    let candidates: DuplicateComplaintInput[] = [];
    try {
      candidates = await this.repo.findCandidatesForDuplicateCheck(
        input.primary_category,
        input.disaster_type ?? null,
        input.latitude,
        input.longitude,
        undefined,
        50
      );
    } catch (err: any) {
      console.warn('Failed to retrieve candidates for duplicate check:', err?.message);
    }

    // 2. Persist complaint and initial status history atomically in transaction
    const createdRecord = await this.repo.create(citizenId, input);
    const complaintDto = this.repo.toDetailDto(createdRecord);

    // 3. Run AI Orchestration (resilient, non-blocking failure)
    let assessmentResult: any;
    let isDuplicate = false;
    let parentComplaintId: string | null = null;

    try {
      assessmentResult = await this.orchestrator.assessComplaint(
        {
          id: complaintDto.id,
          title: complaintDto.title,
          description: complaintDto.description,
          category: complaintDto.primary_category,
          disasterType: complaintDto.disaster_type as any,
          latitude: complaintDto.latitude,
          longitude: complaintDto.longitude,
        },
        candidates,
        currentUser.role
      );

      // Determine parent-child clustering:
      // If user explicitly marked override_duplicate = true, keep as original.
      // Otherwise, if a match is found among prior candidates, tag as DUPLICATE pointing to parent.
      if (input.override_duplicate) {
        isDuplicate = false;
        parentComplaintId = null;
      } else if (
        assessmentResult.duplicate_check?.has_potential_duplicate &&
        assessmentResult.duplicate_check?.parent_candidate_id
      ) {
        isDuplicate = true;
        parentComplaintId = assessmentResult.duplicate_check.parent_candidate_id;
      }
    } catch (err: any) {
      assessmentResult = {
        duplicate_check: {
          status: 'failed',
          error: err?.message || 'Duplicate check execution failed',
          citizen_advisory: 'Duplicate verification temporarily unavailable.',
        },
        priority_assessment: {
          status: 'failed',
          error: err?.message || 'Priority assessment execution failed',
          explanation: 'Priority assessment temporarily unavailable; queued for manual review.',
        },
      };
    }

    // 4. Persist AI assessment and parent clustering in DB so read operations NEVER call AI services again
    try {
      const persistedRecord = await this.repo.updateAIAssessment(
        complaintDto.id,
        assessmentResult,
        isDuplicate,
        parentComplaintId
      );
      return this.repo.toDetailDto(persistedRecord);
    } catch (persistErr: any) {
      complaintDto.ai_assessment = assessmentResult;
      complaintDto.is_duplicate = isDuplicate;
      complaintDto.parent_complaint_id = parentComplaintId;
      return complaintDto;
    }
  }

  /**
   * Lists complaints with role-based access control, filtering, pagination, and deterministic sorting.
   */
  public async listComplaints(
    currentUser: AuthenticatedUser,
    query: ListComplaintsQuery
  ): Promise<ComplaintListResult> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    // Build Prisma filter clause
    const where: Prisma.ComplaintWhereInput = {};

    // Role-based visibility scoping
    if (currentUser.role === 'CITIZEN') {
      where.citizen_id = currentUser.id;
    }

    // Category filter
    if (query.category) {
      where.primary_category = query.category;
    }

    // Status filter
    if (query.status) {
      where.current_status = query.status;
    }

    // Disaster type filter
    const disasterType = query.disaster_type || query.disasterType;
    if (disasterType) {
      where.disaster_type = disasterType;
    }

    // Substring search on title and description
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Stable, deterministic sorting with ID tie-breaker
    const sortBy = query.sort_by || query.sortBy || 'created_at';
    const sortOrder = query.sort_order || query.sortOrder || 'desc';

    const orderBy: Prisma.ComplaintOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { id: 'desc' }, // Deterministic tie-breaker
    ];

    const { complaints, total } = await this.repo.list(where, page, limit, orderBy);

    const totalPages = Math.ceil(total / limit) || 1;
    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
    };

    return {
      complaints: complaints.map((c) => this.repo.toListItemDto(c)),
      meta: paginationMeta,
      pagination: paginationMeta,
    };
  }

  /**
   * Retrieves full complaint details, ensuring ownership access control for citizens.
   */
  public async getComplaintById(
    currentUser: AuthenticatedUser,
    complaintId: string
  ): Promise<ComplaintDetailDto> {
    const complaint = await this.repo.findById(complaintId);

    if (!complaint) {
      throw new AppError('Complaint not found', 404, 'NOT_FOUND');
    }

    // Citizens may only access their own complaints.
    // Return 404 instead of 403 to prevent existence leakage / ID enumeration.
    if (currentUser.role === 'CITIZEN' && complaint.citizen_id !== currentUser.id) {
      throw new AppError('Complaint not found', 404, 'NOT_FOUND');
    }

    const detailDto = this.repo.toDetailDto(complaint);

    // High-performance optimization: If complaint already has persisted AI assessment, return immediately!
    // ZERO AI calls on read operations. Eliminates DB read bottleneck and preserves chronological causality.
    if (detailDto.ai_assessment && detailDto.ai_assessment.duplicate_check?.status) {
      return detailDto;
    }

    // Fallback: only evaluate dynamically for legacy complaints submitted before Sprint 7
    try {
      const candidates = await this.repo.findCandidatesForDuplicateCheck(
        detailDto.primary_category,
        detailDto.disaster_type,
        detailDto.latitude,
        detailDto.longitude,
        detailDto.id,
        50
      );

      detailDto.ai_assessment = await this.orchestrator.assessComplaint(
        {
          id: detailDto.id,
          title: detailDto.title,
          description: detailDto.description,
          category: detailDto.primary_category,
          disasterType: detailDto.disaster_type as any,
          latitude: detailDto.latitude,
          longitude: detailDto.longitude,
        },
        candidates,
        currentUser.role
      );

      // Persist so future reads never re-evaluate
      const isDup = !!detailDto.ai_assessment?.duplicate_check?.has_potential_duplicate && !!detailDto.ai_assessment?.duplicate_check?.parent_candidate_id;
      const parentId = isDup ? (detailDto.ai_assessment?.duplicate_check?.parent_candidate_id || null) : null;
      detailDto.is_duplicate = isDup;
      detailDto.parent_complaint_id = parentId;
      await this.repo.updateAIAssessment(detailDto.id, detailDto.ai_assessment, isDup, parentId).catch(() => {});
    } catch (err: any) {
      detailDto.ai_assessment = {
        duplicate_check: {
          status: 'failed',
          error: err?.message || 'Duplicate check execution failed',
          citizen_advisory: 'Duplicate verification temporarily unavailable.',
        },
        priority_assessment: {
          status: 'failed',
          error: err?.message || 'Priority assessment execution failed',
          explanation: 'Priority assessment temporarily unavailable; queued for manual review.',
        },
      };
    }

    return detailDto;
  }

  /**
   * Updates complaint status through the centralized transition policy and commits atomically.
   * Only administrators are authorized.
   */
  public async updateComplaintStatus(
    currentUser: AuthenticatedUser,
    complaintId: string,
    input: UpdateComplaintStatusInput
  ): Promise<{
    complaint_id: string;
    previous_status: ComplaintStatus;
    current_status: ComplaintStatus;
    updated_at: string;
    complaint: ComplaintDetailDto;
  }> {
    // 1. Authorization check
    if (currentUser.role !== 'ADMIN') {
      throw new AppError('Only administrators are authorized to update complaint status', 403, 'FORBIDDEN');
    }

    // 2. Fetch current complaint
    const current = await this.repo.findById(complaintId);
    if (!current) {
      throw new AppError('Complaint not found', 404, 'NOT_FOUND');
    }

    const previousStatus = current.current_status;

    // 3. Centralized status transition validation
    validateStatusTransition(previousStatus, input.new_status, input.reason_or_notes);

    // 4. Atomic transaction update in database
    const updated = await this.repo.updateStatus(
      complaintId,
      input.new_status,
      currentUser.id,
      input.reason_or_notes
    );

    const complaintDto = this.repo.toDetailDto(updated);

    return {
      complaint_id: updated.id,
      previous_status: previousStatus,
      current_status: updated.current_status,
      updated_at: new Date(updated.updated_at).toISOString(),
      complaint: complaintDto,
    };
  }

  /**
   * Pre-check candidate complaints for potential duplicates before final submission.
   * Returns human-readable matching complaint details for user confirmation.
   */
  public async checkDuplicate(input: CheckDuplicateInput): Promise<DuplicateCheckResultDto> {
    let candidates: DuplicateComplaintInput[] = [];
    try {
      candidates = await this.repo.findCandidatesForDuplicateCheck(
        input.primary_category,
        input.disaster_type ?? null,
        input.latitude,
        input.longitude,
        undefined,
        20
      );
    } catch (err: any) {
      console.warn('Failed to retrieve candidates for duplicate pre-check:', err?.message);
    }

    if (!candidates || candidates.length === 0) {
      return {
        has_potential_duplicate: false,
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      };
    }

    try {
      const dupRes = await this.duplicateClient.evaluateDuplicates({
        target_complaint: {
          id: 'draft-precheck',
          title: input.title,
          description: input.description,
          category: input.primary_category,
          disaster_type: input.disaster_type ?? null,
          latitude: input.latitude,
          longitude: input.longitude,
        },
        candidate_pool: candidates,
      });

      const matchingDetails = dupRes.matches.filter(
        (m) =>
          m.recommendation === 'LIKELY_DUPLICATE' ||
          m.recommendation === 'POSSIBLE_DUPLICATE' ||
          m.combined_score >= 0.50 ||
          m.distance_meters <= 15.0
      );

      if (matchingDetails.length === 0) {
        return {
          has_potential_duplicate: false,
          candidates_evaluated: dupRes.candidates_evaluated,
          matches: [],
          top_match: null,
        };
      }

      // Fetch actual database records for rich metadata (status, address, etc.)
      const matchIds = matchingDetails.map((m) => m.candidate_id);
      let records: any[] = [];
      try {
        records = await prisma.complaint.findMany({
          where: { id: { in: matchIds } },
          select: {
            id: true,
            title: true,
            description: true,
            primary_category: true,
            current_status: true,
            address_text: true,
            created_at: true,
          },
        });
      } catch (dbErr) {
        console.warn('Failed to fetch rich complaint records for duplicates:', dbErr);
      }

      const recordMap = new Map(records.map((r) => [r.id, r]));
      const candidateMap = new Map(candidates.map((c) => [c.id, c]));

      const formattedMatches: DuplicateMatchItem[] = matchingDetails.map((m) => {
        const dbRec = recordMap.get(m.candidate_id);
        const cand = candidateMap.get(m.candidate_id);
        return {
          id: m.candidate_id,
          title: dbRec?.title || cand?.title || 'Existing Report',
          description: dbRec?.description || cand?.description || '',
          primary_category: (dbRec?.primary_category || cand?.category || input.primary_category) as any,
          current_status: dbRec?.current_status || 'SUBMITTED',
          distance_meters: m.distance_meters,
          similarity_score: m.combined_score,
          recommendation: m.recommendation,
          address_text: dbRec?.address_text ?? null,
          created_at: dbRec?.created_at ? dbRec.created_at.toISOString() : new Date().toISOString(),
        };
      });

      return {
        has_potential_duplicate: true,
        candidates_evaluated: dupRes.candidates_evaluated,
        matches: formattedMatches,
        top_match: formattedMatches[0] || null,
      };
    } catch (err: any) {
      console.warn('Duplicate pre-check evaluation error:', err?.message);
      return {
        has_potential_duplicate: false,
        candidates_evaluated: 0,
        matches: [],
        top_match: null,
      };
    }
  }
}

export const complaintService = new ComplaintService();
