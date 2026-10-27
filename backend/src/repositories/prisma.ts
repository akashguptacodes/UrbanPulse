import { PrismaClient } from '@prisma/client';
import { config, sanitizeDatabaseUrl } from '../config/env.js';

// Global declaration for singleton pattern in development
declare global {
  // eslint-disable-next-line no-var
  var __urbanpulse_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__urbanpulse_prisma ??
  new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  global.__urbanpulse_prisma = prisma;
}

/**
 * Verifies database connectivity. Reports actionable instructions if unreachable.
 */
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // eslint-disable-next-line no-console
    console.log(`[Database] PostgreSQL connected successfully (${sanitizeDatabaseUrl(config.DATABASE_URL)})`);
    return true;
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[Database Warning] Unable to establish PostgreSQL connection.`);
    // eslint-disable-next-line no-console
    console.error(`[Database Warning] Target: ${sanitizeDatabaseUrl(config.DATABASE_URL)}`);
    // eslint-disable-next-line no-console
    console.error(
      `[Database Action Required] Ensure your PostgreSQL / Neon DATABASE_URL is set in .env and migrations are deployed (npm run db:migrate:deploy).`
    );
    return false;
  }
}

/**
 * Gracefully disconnects Prisma client
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('[Database] PostgreSQL connection closed.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Database Error] Error disconnecting from PostgreSQL:', err);
  }
}
