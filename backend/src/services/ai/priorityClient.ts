import { config } from '../../config/env.js';
import {
  PriorityAssessRequest,
  PriorityAssessResponse,
  priorityAssessResponseSchema,
} from './aiSchemas.js';

export class PriorityServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'PriorityServiceError';
  }
}

export class PriorityServiceClient {
  constructor(
    private readonly baseUrl: string = config.PRIORITY_SERVICE_URL,
    private readonly timeoutMs: number = config.AI_REQUEST_TIMEOUT_MS
  ) {}

  /**
   * Sends complaint data to the Priority Assessment Service.
   */
  public async assessPriority(
    requestPayload: PriorityAssessRequest
  ): Promise<PriorityAssessResponse> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/api/v1/priority/assess`;
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
        throw new PriorityServiceError(
          `Priority service returned HTTP ${response.status}`,
          'PRIORITY_SERVICE_HTTP_ERROR',
          response.status
        );
      }

      const json = await response.json();
      const parsed = priorityAssessResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new PriorityServiceError(
          'Priority service returned malformed response schema',
          'PRIORITY_SERVICE_SCHEMA_ERROR'
        );
      }

      return parsed.data;
    } catch (error: any) {
      if (error instanceof PriorityServiceError) {
        throw error;
      }
      if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
        throw new PriorityServiceError(
          `Priority assessment service timed out after ${this.timeoutMs}ms`,
          'PRIORITY_SERVICE_TIMEOUT'
        );
      }
      throw new PriorityServiceError(
        `Failed to reach priority assessment service: ${error?.message || 'Network error'}`,
        'PRIORITY_SERVICE_UNAVAILABLE'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const priorityServiceClient = new PriorityServiceClient();

