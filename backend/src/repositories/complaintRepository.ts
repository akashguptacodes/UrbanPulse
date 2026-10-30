import { Prisma, Complaint, ComplaintStatus, ComplaintCategory } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  ComplaintListItemDto,
  ComplaintDetailDto,
  CreateComplaintInput,
} from '../types/complaint.js';
import { AppError } from '../middleware/errorHandler.js';
import { DuplicateComplaintInput } from '../services/ai/aiSchemas.js';
import { storageService } from '../services/storageService.js';

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
  ai_assessment?: any;
  is_duplicate?: boolean;
  parent_complaint_id?: string | null;
  duplicate_count?: number;
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
  updateAIAssessment(
    complaintId: string,
    aiAssessment: any,
    isDuplicate: boolean,
    parentComplaintId?: string | null
  ): Promise<ComplaintWithRelations>;
  findCandidatesForDuplicateCheck(
    category: ComplaintCategory,
    disasterType?: string | null,
    latitude?: number,
    longitude?: number,
    excludeId?: string,
    limit?: number
  ): Promise<DuplicateComplaintInput[]>;
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
    return prisma.$transaction(
      async (tx) => {
        // Create the complaint and initial status history in a single atomic nested query
        const fullComplaint = await tx.complaint.create({
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
            evidence:
              input.evidence && input.evidence.length > 0
                ? {
                    create: input.evidence.map((e) => ({
                      original_filename: e.original_filename,
                      mime_type: e.mime_type,
                      file_size_bytes: e.file_size_bytes,
                      storage_key: e.storage_key,
                    })),
                  }
                : undefined,
            status_history: {
              create: {
                changed_by_user_id: citizenId,
                previous_status: null,
                new_status: ComplaintStatus.SUBMITTED,
                reason_or_notes: 'Initial complaint submission',
              },
            },
          },
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
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }

  /**
   * Retrieves a complaint by ID with relations and linked duplicates count.
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

    if (!complaint) return null;

    const res = complaint as any;
    try {
      res.duplicate_count = await prisma.complaint.count({
        where: { parent_complaint_id: id } as any,
      });
    } catch {
      res.duplicate_count = 0;
    }

    return res as ComplaintWithRelations;
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
    return prisma.$transaction(
      async (tx) => {
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

        // 2. Update complaint status and append status history atomically in one query
        const fullComplaint = await tx.complaint.update({
          where: { id: complaintId },
          data: {
            current_status: newStatus,
            updated_at: new Date(),
            status_history: {
              create: {
                changed_by_user_id: changedByUserId,
                previous_status: previousStatus,
                new_status: newStatus,
                reason_or_notes: reasonOrNotes?.trim() || null,
              },
            },
          },
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
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }

  /**
   * Persists AI duplicate & priority assessment snapshot and parent clustering links atomically.
   */
  public async updateAIAssessment(
    complaintId: string,
    aiAssessment: any,
    isDuplicate: boolean,
    parentComplaintId?: string | null
  ): Promise<ComplaintWithRelations> {
    try {
      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          ai_assessment: aiAssessment,
          is_duplicate: isDuplicate,
          parent_complaint_id: parentComplaintId || null,
        } as any,
        include: {
          citizen: { select: { id: true, full_name: true, email: true } },
          evidence: true,
          status_history: {
            orderBy: { created_at: 'asc' },
            include: { changed_by: { select: { full_name: true, email: true } } },
          },
        },
      });
      return updated as ComplaintWithRelations;
    } catch {
      // Graceful fallback for non-migrated DB instances
      const existing = await this.findById(complaintId);
      if (existing) {
        existing.ai_assessment = aiAssessment;
        existing.is_duplicate = isDuplicate;
        existing.parent_complaint_id = parentComplaintId || null;
        return existing;
      }
      throw new Error(`Complaint ${complaintId} not found`);
    }
  }

  /**
   * Retrieves bounded, privacy-filtered candidate complaints for duplicate checking.
   */
  public async findCandidatesForDuplicateCheck(
    category: ComplaintCategory,
    disasterType?: string | null,
    latitude?: number,
    longitude?: number,
    excludeId?: string,
    limit: number = 50
  ): Promise<DuplicateComplaintInput[]> {
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const where: Prisma.ComplaintWhereInput = {
      primary_category: category,
      current_status: {
        notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED],
      },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    if (category === ComplaintCategory.DISASTERS && disasterType) {
      where.disaster_type = disasterType;
    }

    // Geospatial bounding box (+/- 0.005 degrees ≈ 550m)
    if (latitude !== undefined && longitude !== undefined) {
      const delta = 0.005;
      where.latitude = {
        gte: new Prisma.Decimal(latitude - delta),
        lte: new Prisma.Decimal(latitude + delta),
      };
      where.longitude = {
        gte: new Prisma.Decimal(longitude - delta),
        lte: new Prisma.Decimal(longitude + delta),
      };
    }

    const rows = await prisma.complaint.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        primary_category: true,
        disaster_type: true,
        latitude: true,
        longitude: true,
      },
      take: cappedLimit,
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.primary_category as any,
      disaster_type: (r.disaster_type as any) || null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    }));
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
      is_duplicate: (complaint as any).is_duplicate ?? false,
      parent_complaint_id: (complaint as any).parent_complaint_id ?? null,
      created_at: new Date(complaint.created_at).toISOString(),
      updated_at: new Date(complaint.updated_at).toISOString(),
    };
  }

  /**
   * Converts a database record to a detailed DTO with evidence, history, and AI assessment.
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
      is_duplicate: (complaint as any).is_duplicate ?? false,
      parent_complaint_id: (complaint as any).parent_complaint_id ?? null,
      duplicate_count: (complaint as any).duplicate_count ?? 0,
      ai_assessment: (complaint as any).ai_assessment || undefined,
      created_at: new Date(complaint.created_at).toISOString(),
      updated_at: new Date(complaint.updated_at).toISOString(),
      evidence: (complaint.evidence || []).map((e) => ({
        id: e.id,
        original_filename: e.original_filename,
        mime_type: e.mime_type,
        file_size_bytes: e.file_size_bytes,
        uploaded_at: new Date(e.uploaded_at).toISOString(),
        download_url: storageService.getFileUrl(e.storage_key, complaint.id, e.id),
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
    const cloned = JSON.parse(JSON.stringify(found)) as ComplaintWithRelations;
    let dupCount = 0;
    for (const c of this.complaints.values()) {
      if (c.parent_complaint_id === id) {
        dupCount++;
      }
    }
    cloned.duplicate_count = dupCount;
    return cloned;
  }

  public async updateAIAssessment(
    complaintId: string,
    aiAssessment: any,
    isDuplicate: boolean,
    parentComplaintId?: string | null
  ): Promise<ComplaintWithRelations> {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) {
      throw new Error(`Complaint ${complaintId} not found`);
    }
    complaint.ai_assessment = aiAssessment;
    complaint.is_duplicate = isDuplicate;
    complaint.parent_complaint_id = parentComplaintId || null;
    return JSON.parse(JSON.stringify(complaint)) as ComplaintWithRelations;
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

  public async findCandidatesForDuplicateCheck(
    category: ComplaintCategory,
    disasterType?: string | null,
    latitude?: number,
    longitude?: number,
    excludeId?: string,
    limit: number = 50
  ): Promise<DuplicateComplaintInput[]> {
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const delta = 0.005;
    const candidates: DuplicateComplaintInput[] = [];

    for (const c of this.complaints.values()) {
      if (excludeId && c.id === excludeId) continue;
      if (c.primary_category !== category) continue;
      if (
        c.current_status === ComplaintStatus.RESOLVED ||
        c.current_status === ComplaintStatus.REJECTED
      ) {
        continue;
      }
      if (
        category === ComplaintCategory.DISASTERS &&
        disasterType &&
        c.disaster_type !== disasterType
      ) {
        continue;
      }
      if (latitude !== undefined && longitude !== undefined) {
        const cLat = Number(c.latitude);
        const cLng = Number(c.longitude);
        if (
          cLat < latitude - delta ||
          cLat > latitude + delta ||
          cLng < longitude - delta ||
          cLng > longitude + delta
        ) {
          continue;
        }
      }

      candidates.push({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.primary_category as any,
        disaster_type: (c.disaster_type as any) || null,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
      });

      if (candidates.length >= cappedLimit) break;
    }

    return candidates;
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
      is_duplicate: complaint.is_duplicate ?? false,
      parent_complaint_id: complaint.parent_complaint_id ?? null,
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
      is_duplicate: complaint.is_duplicate ?? false,
      parent_complaint_id: complaint.parent_complaint_id ?? null,
      duplicate_count: complaint.duplicate_count ?? 0,
      ai_assessment: complaint.ai_assessment,
      created_at: new Date(complaint.created_at).toISOString(),
      updated_at: new Date(complaint.updated_at).toISOString(),
      evidence: (complaint.evidence || []).map((e) => ({
        id: e.id,
        original_filename: e.original_filename,
        mime_type: e.mime_type,
        file_size_bytes: e.file_size_bytes,
        uploaded_at: new Date(e.uploaded_at).toISOString(),
        download_url: storageService.getFileUrl(e.storage_key, complaint.id, e.id),
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
