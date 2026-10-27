import { ComplaintStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Permitted complaint status transitions.
 * Centralized state machine rules according to Sprint 0/3 specifications.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<ComplaintStatus, ReadonlyArray<ComplaintStatus>>> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'UNDER_REVIEW', 'REJECTED'],
  RESOLVED: [], // Terminal state
  REJECTED: [], // Terminal state
};

/**
 * Checks if a status transition from `fromStatus` to `toStatus` is permitted.
 */
export function isAllowedTransition(fromStatus: ComplaintStatus, toStatus: ComplaintStatus): boolean {
  if (fromStatus === toStatus) {
    return false;
  }
  const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowedNext.includes(toStatus);
}

/**
 * Validates a requested status transition.
 * Throws an AppError with code 'INVALID_STATUS_TRANSITION' or 'REJECTION_REASON_REQUIRED' if invalid.
 */
export function validateStatusTransition(
  fromStatus: ComplaintStatus,
  toStatus: ComplaintStatus,
  reasonOrNotes?: string | null
): void {
  // Disallow transition to identical status
  if (fromStatus === toStatus) {
    const error: AppError = new Error(`Complaint is already in status '${fromStatus}'`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  // Check state machine permission
  if (!isAllowedTransition(fromStatus, toStatus)) {
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)';
    const error: AppError = new Error(
      `Invalid status transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowedStr}`
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  // When transitioning to REJECTED, an administrative reason/note is strictly required
  if (toStatus === 'REJECTED') {
    const trimmedReason = reasonOrNotes?.trim();
    if (!trimmedReason || trimmedReason.length === 0) {
      const error: AppError = new Error(
        'A reason or administrative note is mandatory when rejecting a complaint.'
      );
      error.statusCode = 400;
      error.code = 'REJECTION_REASON_REQUIRED';
      throw error;
    }
  }
}
