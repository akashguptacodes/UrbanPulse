import { Request, Response, NextFunction } from 'express';
import { complaintService, ComplaintService } from '../services/complaintService.js';
import { storageService, IStorageService } from '../services/storageService.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createComplaintSchema,
  listComplaintsQuerySchema,
  updateComplaintStatusSchema,
  complaintIdParamSchema,
} from '../validators/complaintValidators.js';

export class ComplaintController {
  constructor(
    private service: ComplaintService = complaintService,
    private storage: IStorageService = storageService
  ) {}

  /**
   * POST /api/complaints
   * Creates a new complaint for the authenticated user
   */
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in to continue.',
          },
        });
        return;
      }

      const parsedBody = createComplaintSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid complaint submission payload',
            details: parsedBody.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const createdComplaint = await this.service.createComplaint(req.user, parsedBody.data);

      res.status(201).json({
        success: true,
        data: {
          complaint: createdComplaint,
          ai_assessment: createdComplaint.ai_assessment,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/complaints
   * Lists complaints with filtering, pagination, and sorting
   */
  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in to continue.',
          },
        });
        return;
      }

      const parsedQuery = listComplaintsQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parsedQuery.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const result = await this.service.listComplaints(req.user, parsedQuery.data);

      res.status(200).json({
        success: true,
        data: {
          complaints: result.complaints,
        },
        meta: result.meta,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/complaints/:id
   * Retrieves complaint details by ID
   */
  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in to continue.',
          },
        });
        return;
      }

      const parsedParams = complaintIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid complaint identifier format',
            details: parsedParams.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const complaint = await this.service.getComplaintById(req.user, parsedParams.data.id);

      res.status(200).json({
        success: true,
        data: {
          complaint,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/complaints/:id/status
   * Updates status of a complaint (Admin only)
   */
  public updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in to continue.',
          },
        });
        return;
      }

      const parsedParams = complaintIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid complaint identifier format',
            details: parsedParams.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const parsedBody = updateComplaintStatusSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update payload',
            details: parsedBody.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const result = await this.service.updateComplaintStatus(
        req.user,
        parsedParams.data.id,
        parsedBody.data
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/complaints/evidence/upload
   * Uploads an evidence image file (JPEG, PNG, WebP) to storage (Cloudinary or local)
   */
  public uploadEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to upload evidence', 401, 'UNAUTHORIZED');
      }

      if (!req.file) {
        throw new AppError('No evidence image file uploaded', 400, 'NO_FILE_UPLOADED');
      }

      const storageKey = await this.storage.saveFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const fileUrl = this.storage.getFileUrl(storageKey);

      res.status(201).json({
        success: true,
        data: {
          evidence: {
            original_filename: req.file.originalname,
            mime_type: req.file.mimetype,
            file_size_bytes: req.file.size,
            storage_key: storageKey,
            url: fileUrl,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/complaints/:id/evidence/:evidenceId
   * Streams or redirects to complaint evidence image with access control verification
   */
  public getEvidence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required to access evidence', 401, 'UNAUTHORIZED');
      }

      const { id: complaintId, evidenceId } = req.params;
      const complaint = await this.service.getComplaintById(req.user, complaintId);

      const evidence = complaint.evidence.find((e) => e.id === evidenceId);
      if (!evidence) {
        throw new AppError('Evidence record not found', 404, 'EVIDENCE_NOT_FOUND');
      }

      const fileUrl = this.storage.getFileUrl(evidence.original_filename);
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        res.redirect(fileUrl);
        return;
      }

      // Stream local buffer
      const buffer = await this.storage.getFileBuffer(evidence.original_filename);
      res.setHeader('Content-Type', evidence.mime_type);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };
}

export const complaintController = new ComplaintController();
