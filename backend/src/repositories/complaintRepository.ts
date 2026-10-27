import { Prisma, Complaint, ComplaintStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  ComplaintListItemDto,
  ComplaintDetailDto,
  CreateComplaintInput,
} from '../types/complaint.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ComplaintWithRelations extends Complaint {
  citizen?: { id: string; full_name: string; email: string };
  evidence?: Array<{
    id: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    uploaded_at: Date;
    storage_key: string;
  }>;
  status_history?: Array<{
    id: string;
    previous_status: ComplaintStatus | null;
    new_status: ComplaintStatus;
    reason_or_notes: string | null;
    created_at: Date;
    changed_by?: { full_name: string; email: string };
  }>;
}

export interface IComplaintRepository {
  create(citizenId: string, input: CreateComplaintInput): Promise<ComplaintWithRelations>;
  findById(id: string): Promise<ComplaintWithRelations | null>;
  list(
    where: Prisma.ComplaintWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.ComplaintOrderByWithRelationInput[]
  ): Promise<{ complaints: ComplaintWithRelations[]; total: number }>;
  updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    changedByUserId: string,
    reasonOrNotes?: string | null
  ): Promise<ComplaintWithRelations>;
  toListItemDto(complaint: ComplaintWithRelations): ComplaintListItemDto;
  toDetailDto(complaint: ComplaintWithRelations): ComplaintDetailDto;
}

export class PrismaComplaintRepository implements IComplaintRepository {
  /**
   * Creates a complaint and its initial status history atomically in a transaction.
   */
  public async create(
    citizenId: string,
    input: CreateComplaintInput
  ): Promise<ComplaintWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. Create the complaint record with initial SUBMITTED status
      const createdComplaint = await tx.complaint.create({
        data: {
          citizen_id: citizenId,
          primary_category: input.primary_category,
          disaster_type: input.disaster_type ?? null,
          title: input.title,
          description: input.description,
          latitude: new Prisma.Decimal(input.latitude),
          longitude: new Prisma.Decimal(input.longitude),
          address_text: input.address_text ?? null,
          current_status: ComplaintStatus.SUBMITTED,
          evidence: input.evidence && input.evidence.length > 0
            ? {
                create: input.evidence.map((e) => ({
                  original_filename: e.original_filename,
                  mime_type: e.mime_type,
                  file_size_bytes: e.file_size_bytes,
                  storage_key: e.storage_key,
                })),
              }
            : undefined,
        },
        include: {
          citizen: { select: { id: true, full_name: true, email: true } },
          evidence: true,
        },
      });

      // 2. Insert the initial status history record in the same atomic transaction
      await tx.complaintStatusHistory.create({
        data: {
          complaint_id: createdComplaint.id,
          changed_by_user_id: citizenId,
          previous_status: null,
          new_status: ComplaintStatus.SUBMITTED,
          reason_or_notes: 'Initial complaint submission',
        },
      });

      // Fetch complete record with relations
      const fullComplaint = await tx.complaint.findUniqueOrThrow({
        where: { id: createdComplaint.id },
        include: {
          citizen: { select: { id: true, full_name: true, email: true } },
          evidence: true,
          status_history: {
            orderBy: { created_at: 'asc' },
            include: { changed_by: { select: { full_name: true, email: true } } },
          },
        },
      });

      return fullComplaint as ComplaintWithRelations;
    });
  }

  /**
   * Retrieves a complaint by ID with relations.
   */
  public async findById(id: string): Promise<ComplaintWithRelations | null> {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        citizen: { select: { id: true, full_name: true, email: true } },
        evidence: true,
        status_history: {
          orderBy: { created_at: 'asc' },
          include: { changed_by: { select: { full_name: true, email: true } } },
        },
      },
    });

    return complaint as ComplaintWithRelations | null;
  }

  /**
   * Lists complaints with structured filtering, pagination, and deterministic ordering.
   */
  public async list(
    where: Prisma.ComplaintWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.ComplaintOrderByWithRelationInput[]
  ): Promise<{ complaints: ComplaintWithRelations[]; total: number }> {
    const skip = (page - 1) * limit;

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          citizen: { select: { id: true, full_name: true, email: true } },
          evidence: true,
        },
      }),
    ]);

    return {
      complaints: complaints as ComplaintWithRelations[],
      total,
    };
  }

  /**
   * Updates complaint status and records status history atomically in a transaction.
   */
  public async updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    changedByUserId: string,
    reasonOrNotes?: string | null
  ): Promise<ComplaintWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current complaint with a write lock / check
      const current = await tx.complaint.findUnique({
        where: { id: complaintId },
      });

      if (!current) {
        const error: AppError = new Error('Complaint not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      const previousStatus = current.current_status;

      // 2. Update complaint status
      await tx.complaint.update({
        where: { id: complaintId },
        data: {
          current_status: newStatus,
          updated_at: new Date(),
        },
      });

      // 3. Insert status history record
      await tx.complaintStatusHistory.create({
        data: {
          complaint_id: complaintId,
          changed_by_user_id: changedByUserId,
          previous_status: previousStatus,
          new_status: newStatus,
          reason_or_notes: reasonOrNotes?.trim() || null,
        },
      });

      // 4. Return updated complaint with relations
      const fullComplaint = await tx.complaint.findUniqueOrThrow({
        where: { id: complaintId },
        include: {
          citizen: { select: { id: true, full_name: true, email: true } },
          evidence: true,
          status_history: {
            orderBy: { created_at: 'asc' },
            include: { changed_by: { select: { full_name: true, email: true } } },
          },
        },
      });

      return fullComplaint as ComplaintWithRelations;
    });
  }

  /**
   * Converts a database record to a clean list DTO.
   */
  public toListItemDto(complaint: ComplaintWithRelations): ComplaintListItemDto {
    return {
      id: complaint.id,
      citizen_id: complaint.citizen_id,
      primary_category: complaint.primary_category,
      disaster_type: complaint.disaster_type,
      title: complaint.title,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
      address_text: complaint.address_text,
      current_status: complaint.current_status,
      created_at: complaint.created_at.toISOString(),
      updated_at: complaint.updated_at.toISOString(),
    };
  }

  /**
   * Converts a database record to a detailed DTO with evidence and history.
   */
  public toDetailDto(complaint: ComplaintWithRelations): ComplaintDetailDto {
    return {
      id: complaint.id,
      citizen_id: complaint.citizen_id,
      citizen_name: complaint.citizen?.full_name || 'Anonymous Citizen',
      primary_category: complaint.primary_category,
      disaster_type: complaint.disaster_type,
      title: complaint.title,
      description: complaint.description,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
      address_text: complaint.address_text,
      current_status: complaint.current_status,
      created_at: complaint.created_at.toISOString(),
      updated_at: complaint.updated_at.toISOString(),
      evidence: (complaint.evidence || []).map((e) => ({
        id: e.id,
        original_filename: e.original_filename,
        mime_type: e.mime_type,
        file_size_bytes: e.file_size_bytes,
        uploaded_at: e.uploaded_at.toISOString(),
        download_url: `/api/v1/complaints/${complaint.id}/evidence/${e.id}`,
      })),
      status_history: (complaint.status_history || []).map((h) => ({
        id: h.id,
        previous_status: h.previous_status,
        new_status: h.new_status,
        reason_or_notes: h.reason_or_notes,
        changed_by: h.changed_by?.full_name || 'System / Admin',
        created_at: h.created_at.toISOString(),
      })),
    };
  }
}

export class InMemoryComplaintRepository implements IComplaintRepository {
  private complaints: Map<string, ComplaintWithRelations> = new Map();
  private userDirectory: Map<string, { full_name: string; email: string }> = new Map();

  public registerUser(id: string, full_name: string, email: string): void {
    this.userDirectory.set(id, { full_name, email });
  }

  public clear(): void {
    this.complaints.clear();
    this.userDirectory.clear();
  }

  public async create(
    citizenId: string,
    input: CreateComplaintInput
  ): Promise<ComplaintWithRelations> {
    const complaintId = crypto.randomUUID();
    const now = new Date();
    const citizenUser = this.userDirectory.get(citizenId) || {
      full_name: 'Test Citizen',
      email: 'citizen@example.com',
    };

    const evidenceList = (input.evidence || []).map((e) => ({
      id: crypto.randomUUID(),
      complaint_id: complaintId,
      original_filename: e.original_filename,
      mime_type: e.mime_type,
      file_size_bytes: e.file_size_bytes,
      storage_key: e.storage_key,
      uploaded_at: now,
    }));

    const initialHistory = {
      id: crypto.randomUUID(),
      complaint_id: complaintId,
      changed_by_user_id: citizenId,
      previous_status: null,
      new_status: ComplaintStatus.SUBMITTED,
      reason_or_notes: 'Initial complaint submission',
      created_at: now,
      changed_by: {
        full_name: citizenUser.full_name,
        email: citizenUser.email,
      },
    };

    const complaint: ComplaintWithRelations = {
      id: complaintId,
      citizen_id: citizenId,
      primary_category: input.primary_category,
      disaster_type: input.disaster_type ?? null,
      title: input.title,
      description: input.description,
      latitude: new Prisma.Decimal(input.latitude),
      longitude: new Prisma.Decimal(input.longitude),
      address_text: input.address_text ?? null,
      current_status: ComplaintStatus.SUBMITTED,
      created_at: now,
      updated_at: now,
      citizen: {
        id: citizenId,
        full_name: citizenUser.full_name,
        email: citizenUser.email,
      },
      evidence: evidenceList,
      status_history: [initialHistory],
    };

    this.complaints.set(complaintId, complaint);
    return JSON.parse(JSON.stringify(complaint)) as ComplaintWithRelations;
  }

  public async findById(id: string): Promise<ComplaintWithRelations | null> {
    const found = this.complaints.get(id);
    if (!found) return null;
    return JSON.parse(JSON.stringify(found)) as ComplaintWithRelations;
  }

  public async list(
    where: Prisma.ComplaintWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.ComplaintOrderByWithRelationInput[]
  ): Promise<{ complaints: ComplaintWithRelations[]; total: number }> {
    let items = Array.from(this.complaints.values());

    // Filter by citizen_id
    if (where.citizen_id) {
      const cid = typeof where.citizen_id === 'string' ? where.citizen_id : undefined;
      if (cid) {
        items = items.filter((c) => c.citizen_id === cid);
      }
    }

    // Filter by primary_category
    if (where.primary_category) {
      items = items.filter((c) => c.primary_category === where.primary_category);
    }

    // Filter by current_status
    if (where.current_status) {
      items = items.filter((c) => c.current_status === where.current_status);
    }

    // Filter by disaster_type
    if (where.disaster_type) {
      items = items.filter((c) => c.disaster_type === where.disaster_type);
    }

    // Search filter
    if (where.OR && Array.isArray(where.OR)) {
      items = items.filter((c) => {
        return (where.OR as Array<Prisma.ComplaintWhereInput>).some((clause) => {
          if (clause.title && typeof clause.title === 'object' && 'contains' in clause.title) {
            const term = String(clause.title.contains).toLowerCase();
            if (c.title.toLowerCase().includes(term)) return true;
          }
          if (clause.description && typeof clause.description === 'object' && 'contains' in clause.description) {
            const term = String(clause.description.contains).toLowerCase();
            if (c.description.toLowerCase().includes(term)) return true;
          }
          return false;
        });
      });
    }

    // Sorting
    const primaryOrder = orderBy[0] || { created_at: 'desc' };
    const sortKey = Object.keys(primaryOrder)[0] as keyof ComplaintWithRelations;
    const sortDir = (primaryOrder as Record<string, string>)[sortKey] === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      let valA: unknown = a[sortKey];
      let valB: unknown = b[sortKey];

      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();

      if (valA !== valB) {
        return (valA as number) > (valB as number) ? sortDir : -sortDir;
      }
      // Tie-breaker
      return a.id > b.id ? -1 : 1;
    });

    const total = items.length;
    const skip = (page - 1) * limit;
    const paged = items.slice(skip, skip + limit);

    return {
      complaints: JSON.parse(JSON.stringify(paged)),
      total,
    };
  }

  public async updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    changedByUserId: string,
    reasonOrNotes?: string | null
  ): Promise<ComplaintWithRelations> {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) {
      const error: AppError = new Error('Complaint not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const previousStatus = complaint.current_status;
    const now = new Date();
    const adminUser = this.userDirectory.get(changedByUserId) || {
      full_name: 'Administrator',
      email: 'admin@urbanpulse.gov',
    };

    complaint.current_status = newStatus;
    complaint.updated_at = now;

    const historyRecord = {
      id: crypto.randomUUID(),
      complaint_id: complaintId,
      changed_by_user_id: changedByUserId,
      previous_status: previousStatus,
      new_status: newStatus,
      reason_or_notes: reasonOrNotes?.trim() || null,
      created_at: now,
      changed_by: {
        full_name: adminUser.full_name,
        email: adminUser.email,
      },
    };

    if (!complaint.status_history) {
      complaint.status_history = [];
    }
    complaint.status_history.push(historyRecord);

    return JSON.parse(JSON.stringify(complaint)) as ComplaintWithRelations;
  }

  public toListItemDto(complaint: ComplaintWithRelations): ComplaintListItemDto {
    return {
      id: complaint.id,
      citizen_id: complaint.citizen_id,
      primary_category: complaint.primary_category,
      disaster_type: complaint.disaster_type,
      title: complaint.title,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
      address_text: complaint.address_text,
      current_status: complaint.current_status,
      created_at: new Date(complaint.created_at).toISOString(),
      updated_at: new Date(complaint.updated_at).toISOString(),
    };
  }

  public toDetailDto(complaint: ComplaintWithRelations): ComplaintDetailDto {
    return {
      id: complaint.id,
      citizen_id: complaint.citizen_id,
      citizen_name: complaint.citizen?.full_name || 'Anonymous Citizen',
      primary_category: complaint.primary_category,
      disaster_type: complaint.disaster_type,
      title: complaint.title,
      description: complaint.description,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
      address_text: complaint.address_text,
      current_status: complaint.current_status,
      created_at: new Date(complaint.created_at).toISOString(),
      updated_at: new Date(complaint.updated_at).toISOString(),
      evidence: (complaint.evidence || []).map((e) => ({
        id: e.id,
        original_filename: e.original_filename,
        mime_type: e.mime_type,
        file_size_bytes: e.file_size_bytes,
        uploaded_at: new Date(e.uploaded_at).toISOString(),
        download_url: `/api/v1/complaints/${complaint.id}/evidence/${e.id}`,
      })),
      status_history: (complaint.status_history || []).map((h) => ({
        id: h.id,
        previous_status: h.previous_status,
        new_status: h.new_status,
        reason_or_notes: h.reason_or_notes,
        changed_by: h.changed_by?.full_name || 'System / Admin',
        created_at: new Date(h.created_at).toISOString(),
      })),
    };
  }
}

export const complaintRepository = new PrismaComplaintRepository();
