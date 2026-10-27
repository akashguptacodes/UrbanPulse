import { Prisma, ComplaintStatus } from '@prisma/client';
import {
  complaintRepository,
  IComplaintRepository,
} from '../repositories/complaintRepository.js';
import {
  ComplaintDetailDto,
  ComplaintListResult,
  CreateComplaintInput,
  UpdateComplaintStatusInput,
} from '../types/complaint.js';
import { AuthenticatedUser } from '../types/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateStatusTransition } from './statusTransitionPolicy.js';
import { ListComplaintsQuery } from '../validators/complaintValidators.js';

export class ComplaintService {
  constructor(private repo: IComplaintRepository = complaintRepository) {}

  /**
   * Submits a new civic complaint with initial SUBMITTED status and creates initial status history.
   */
  public async createComplaint(
    currentUser: AuthenticatedUser,
    input: CreateComplaintInput
  ): Promise<ComplaintDetailDto> {
    // Creator is always strictly bound to verified authenticated user
    const citizenId = currentUser.id;

    const createdRecord = await this.repo.create(citizenId, input);
    return this.repo.toDetailDto(createdRecord);
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
      const error: AppError = new Error('Complaint not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Citizens may only access their own complaints.
    // Return 404 instead of 403 to prevent existence leakage / ID enumeration.
    if (currentUser.role === 'CITIZEN' && complaint.citizen_id !== currentUser.id) {
      const error: AppError = new Error('Complaint not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return this.repo.toDetailDto(complaint);
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
      const error: AppError = new Error('Only administrators are authorized to update complaint status');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // 2. Fetch current complaint
    const current = await this.repo.findById(complaintId);
    if (!current) {
      const error: AppError = new Error('Complaint not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
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
}

export const complaintService = new ComplaintService();
