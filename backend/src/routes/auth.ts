import { Router, Request, Response } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);

// Authenticated User Profile
router.get('/me', requireAuth, authController.me);

// Role-Protected Verification Endpoint (Used to verify RBAC enforcement)
router.get(
  '/admin-check',
  requireAuth,
  requireRole(['ADMIN']),
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Admin authorization verified successfully',
        admin_id: req.user?.id,
      },
    });
  }
);

export default router;
