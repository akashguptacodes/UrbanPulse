import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration (strictly credentialed, explicit frontend origin)
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Request parsing
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);

  // v1 API Route Aliases (conforming to Sprint 0 API specification)
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
