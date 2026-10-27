import { z } from 'zod';
import {
  COMPLAINT_CATEGORIES,
  DISASTER_TYPES,
  COMPLAINT_STATUSES,
} from '../types/complaint.js';

export const evidenceItemSchema = z.object({
  original_filename: z.string().min(1).max(255),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: "Only 'image/jpeg', 'image/png', or 'image/webp' are supported" }),
  }),
  file_size_bytes: z
    .number()
    .int()
    .positive()
    .max(5242880, { message: 'File size must not exceed 5MB (5,242,880 bytes)' }),
  storage_key: z.string().min(1).max(255),
});

export const createComplaintSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(5, { message: 'Title must be at least 5 characters long' })
      .max(150, { message: 'Title cannot exceed 150 characters' }),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, { message: 'Description must be at least 10 characters long' })
      .max(2000, { message: 'Description cannot exceed 2000 characters' }),
    primary_category: z.enum(COMPLAINT_CATEGORIES, {
      errorMap: () => ({
        message: "primary_category must be one of: 'POTHOLES', 'STREET_LIGHTS', 'GARBAGE', 'DISASTERS'",
      }),
    }),
    disaster_type: z
      .enum(DISASTER_TYPES, {
        errorMap: () => ({
          message: "disaster_type must be one of: 'FIRE', 'FLOOD', 'OTHER'",
        }),
      })
      .optional()
      .nullable(),
    latitude: z.coerce
      .number({ invalid_type_error: 'Latitude must be a valid number' })
      .min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
      .max(90, { message: 'Latitude must be between -90 and 90 degrees' }),
    longitude: z.coerce
      .number({ invalid_type_error: 'Longitude must be a valid number' })
      .min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
      .max(180, { message: 'Longitude must be between -180 and 180 degrees' }),
    address_text: z.string().trim().max(255).optional().nullable(),
    evidence: z.array(evidenceItemSchema).max(3, { message: 'Maximum 3 evidence attachments allowed' }).optional(),
  })
  .superRefine((data, ctx) => {
    // If DISASTERS, disaster_type is strictly required and must be valid
    if (data.primary_category === 'DISASTERS') {
      if (!data.disaster_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['disaster_type'],
          message: "disaster_type is required when primary_category is 'DISASTERS' (must be 'FIRE', 'FLOOD', or 'OTHER')",
        });
      }
    } else {
      // If non-disaster, disaster_type must NOT be provided
      if (data.disaster_type !== undefined && data.disaster_type !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['disaster_type'],
          message: "disaster_type is only permitted when primary_category is 'DISASTERS'",
        });
      }
    }
  });

export type CreateComplaintBody = z.infer<typeof createComplaintSchema>;

export const listComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, { message: 'Page must be at least 1' }).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100' })
    .default(20),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  disaster_type: z.enum(DISASTER_TYPES).optional(),
  disasterType: z.enum(DISASTER_TYPES).optional(),
  sort_by: z.enum(['created_at', 'current_status', 'updated_at']).default('created_at'),
  sortBy: z.enum(['created_at', 'current_status', 'updated_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().max(100).optional(),
});

export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;

export const updateComplaintStatusSchema = z
  .object({
    new_status: z.enum(COMPLAINT_STATUSES, {
      errorMap: () => ({
        message: "new_status must be one of: 'SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'",
      }),
    }),
    reason_or_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.new_status === 'REJECTED') {
      if (!data.reason_or_notes || data.reason_or_notes.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason_or_notes'],
          message: 'A reason or note is required when rejecting a complaint',
        });
      }
    }
  });

export type UpdateComplaintStatusBody = z.infer<typeof updateComplaintStatusSchema>;

export const complaintIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Complaint ID must be a valid UUID' }),
});
