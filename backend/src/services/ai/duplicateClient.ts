import { config } from '../../config/env.js';
import {
  DuplicateEvaluateRequest,
  DuplicateEvaluateResponse,
  duplicateEvaluateResponseSchema,
} from './aiSchemas.js';

export class DuplicateServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'DuplicateServiceError';
  }
}

export class DuplicateServiceClient {
  constructor(
    private readonly baseUrl: string = config.DUPLICATE_SERVICE_URL,
    private readonly timeoutMs: number = config.AI_REQUEST_TIMEOUT_MS
  ) {}

  /**
   * Sends target complaint and candidate pool to the Duplicate Detection Service.
   */
  public async evaluateDuplicates(
    requestPayload: DuplicateEvaluateRequest
  ): Promise<DuplicateEvaluateResponse> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/api/v1/duplicates/evaluate`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new DuplicateServiceError(
          `Duplicate service returned HTTP ${response.status}`,
          'DUPLICATE_SERVICE_HTTP_ERROR',
          response.status
        );
      }

      const json = await response.json();
      const parsed = duplicateEvaluateResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new DuplicateServiceError(
          'Duplicate service returned malformed response schema',
          'DUPLICATE_SERVICE_SCHEMA_ERROR'
        );
      }

      return parsed.data;
    } catch (error: any) {
      if (error instanceof DuplicateServiceError) {
        throw error;
      }
      if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
        throw new DuplicateServiceError(
          `Duplicate detection service timed out after ${this.timeoutMs}ms`,
          'DUPLICATE_SERVICE_TIMEOUT'
        );
      }
      throw new DuplicateServiceError(
        `Failed to reach duplicate detection service: ${error?.message || 'Network error'}`,
        'DUPLICATE_SERVICE_UNAVAILABLE'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const duplicateServiceClient = new DuplicateServiceClient();

