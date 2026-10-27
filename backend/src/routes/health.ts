import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'urbanpulse-backend',
    version: '0.1.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
