import { app } from './app.js';
import { config } from './config/env.js';
import { verifyDatabaseConnection, disconnectDatabase } from './repositories/prisma.js';

const server = app.listen(config.PORT, async () => {
  // eslint-disable-next-line no-console
  console.log(`[UrbanPulse Backend] Service running on http://localhost:${config.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[UrbanPulse Backend] Environment: ${config.NODE_ENV}`);

  // Test database connection at startup
  await verifyDatabaseConnection();
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n[UrbanPulse Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    // eslint-disable-next-line no-console
    console.log('[UrbanPulse Backend] HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });

  // Force close after 5 seconds if still open
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('[UrbanPulse Backend] Forcefully terminating after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
