import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables directly from backend/.env (supports independent deployment)
const backendEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: backendEnvPath });
dotenv.config(); // fallback for current working directory .env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .preprocess((val) => val ?? process.env.BACKEND_PORT, z.string().default('4000'))
    .transform((val) => parseInt(String(val), 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: 'PORT must be a valid port number (1-65535)',
    }),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DUPLICATE_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  PRIORITY_SERVICE_URL: z.string().url().default('http://localhost:8002'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/urbanpulse?schema=public'),
  JWT_SECRET: z
    .string()
    .min(16, { message: 'JWT_SECRET must be at least 16 characters' })
    .default('development-jwt-secret-min-32-characters-long-key'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Environment configuration validation failed:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;

/**
 * Safely sanitizes database URLs for logging without exposing credentials
 */
export function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '[Invalid or masked database URL]';
  }
}
