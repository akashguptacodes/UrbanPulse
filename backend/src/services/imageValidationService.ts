import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export type ValidatedImageCategory =
  | 'POTHOLES'
  | 'STREET_LIGHTS'
  | 'GARBAGE'
  | 'DISASTERS'
  | 'UNRELATED';

export interface ImageValidationResult {
  isValid: boolean;
  detectedCategory: ValidatedImageCategory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface IImageValidationService {
  validateCivicIssueImage(fileBuffer: Buffer, mimeType: string): Promise<ImageValidationResult>;
}

interface GeminiClassificationPayload {
  is_valid_civic_issue: boolean;
  category: ValidatedImageCategory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

const VALID_CATEGORIES = new Set<ValidatedImageCategory>([
  'POTHOLES',
  'STREET_LIGHTS',
  'GARBAGE',
  'DISASTERS',
]);

const CLASSIFICATION_PROMPT = `You are a strict civic-issue image moderator for UrbanPulse.
Classify whether the provided image clearly depicts one of the following four municipal/civic issue categories:
1. POTHOLES: Road surface damage, potholes, craters, cracked or sunken asphalt/pavement.
2. STREET_LIGHTS: Broken, damaged, flickering, fallen, or unlit street lights / street lamp poles.
3. GARBAGE: Overflowing public dumpsters, garbage piles, illegal trash dumping, uncollected waste, heavy littering.
4. DISASTERS: Civic emergencies or disasters such as fire, smoke/burning structures, flooding, waterlogging, fallen trees blocking roads, or severe infrastructure collapse.

If the image does NOT clearly depict one of those 4 civic issues (for example: selfies, portraits, pets/animals, indoor rooms, food, memes, screenshots, documents, vehicles without road damage, or unrelated landscapes), set "is_valid_civic_issue" to false and "category" to "UNRELATED".

Respond ONLY with JSON matching the requested schema.`;

const FREE_COMPATIBLE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

/**
 * Validates uploaded evidence images using Google Gemini Vision (Interactions API)
 * to ensure they depict one of the 4 supported civic issue categories.
 * Uses only free-tier compatible multimodal models with automatic fallback.
 */
export class GeminiImageValidationService implements IImageValidationService {
  private client: GoogleGenAI | null = null;
  private readonly candidateModels: string[];

  constructor(
    private readonly apiKey: string | undefined = config.GEMINI_API_KEY,
    private readonly isEnabled: boolean = config.IMAGE_VALIDATION_ENABLED,
    private readonly model: string = config.IMAGE_VALIDATION_MODEL
  ) {
    if (this.apiKey && this.apiKey.trim().length > 0) {
      this.client = new GoogleGenAI({
        apiKey: this.apiKey.trim(),
        apiVersion: 'v1beta',
      });
    }

    const primary = FREE_COMPATIBLE_MODELS.includes(
      this.model as (typeof FREE_COMPATIBLE_MODELS)[number]
    )
      ? this.model
      : FREE_COMPATIBLE_MODELS[0];

    this.candidateModels = [
      primary,
      ...FREE_COMPATIBLE_MODELS.filter((m) => m !== primary),
    ];
  }

  public async validateCivicIssueImage(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ImageValidationResult> {
    if (!this.isEnabled) {
      return {
        isValid: true,
        detectedCategory: 'POTHOLES',
        confidence: 'LOW',
        reason: 'Image content validation is disabled by server configuration.',
      };
    }

    if (!this.client) {
      if (config.NODE_ENV === 'test') {
        return {
          isValid: true,
          detectedCategory: 'POTHOLES',
          confidence: 'LOW',
          reason: 'Image validation skipped in test environment without GEMINI_API_KEY.',
        };
      }

      throw new AppError(
        'Image validation service is not configured. Please set GEMINI_API_KEY.',
        503,
        'IMAGE_VALIDATION_UNAVAILABLE'
      );
    }

    const base64Image = fileBuffer.toString('base64');

    let responseText: string | null | undefined;
    let lastErrorMessage = 'Unknown error';

    for (const candidateModel of this.candidateModels) {
      try {
        const interaction = await this.client.interactions.create({
          model: candidateModel,
          store: false,
          input: [
            {
              type: 'text',
              text: CLASSIFICATION_PROMPT,
            },
            {
              type: 'image',
              data: base64Image,
              mime_type: mimeType,
            },
          ],
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: {
              type: 'object',
              properties: {
                is_valid_civic_issue: { type: 'boolean' },
                category: {
                  type: 'string',
                  enum: ['POTHOLES', 'STREET_LIGHTS', 'GARBAGE', 'DISASTERS', 'UNRELATED'],
                },
                confidence: {
                  type: 'string',
                  enum: ['HIGH', 'MEDIUM', 'LOW'],
                },
                reason: { type: 'string' },
              },
              required: ['is_valid_civic_issue', 'category', 'confidence', 'reason'],
            },
          },
        });

        responseText = interaction.output_text;
        if (responseText) {
          break;
        }
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    if (!responseText) {
      throw new AppError(
        `Unable to verify image category at this time: ${lastErrorMessage}`,
        503,
        'IMAGE_VALIDATION_FAILED'
      );
    }

    let parsed: GeminiClassificationPayload;
    try {
      parsed = JSON.parse(responseText) as GeminiClassificationPayload;
    } catch {
      throw new AppError(
        'Image validation service returned an invalid response format.',
        503,
        'IMAGE_VALIDATION_FAILED'
      );
    }

    const isValid =
      Boolean(parsed.is_valid_civic_issue) && VALID_CATEGORIES.has(parsed.category);

    return {
      isValid,
      detectedCategory: isValid ? parsed.category : 'UNRELATED',
      confidence: parsed.confidence || 'MEDIUM',
      reason: parsed.reason || (isValid ? 'Matches civic issue category.' : 'Image does not match any of the 4 civic issue categories.'),
    };
  }
}

export const imageValidationService = new GeminiImageValidationService();
