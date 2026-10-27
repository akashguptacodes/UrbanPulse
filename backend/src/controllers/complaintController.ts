import { Request, Response, NextFunction } from 'express';
import { complaintService, ComplaintService } from '../services/complaintService.js';
import {
  createComplaintSchema,
  listComplaintsQuerySchema,
  updateComplaintStatusSchema,
  complaintIdParamSchema,
} from '../validators/complaintValidators.js';

export class ComplaintController {
  constructor(private service: ComplaintService = complaintService) {}

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
}

export const complaintController = new ComplaintController();
