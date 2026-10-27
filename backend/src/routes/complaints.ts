import { Router } from 'express';
import { complaintController } from '../controllers/complaintController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All complaint endpoints require an authenticated session
router.use(requireAuth);

// Citizen & Admin endpoints
router.post('/', complaintController.create);
router.get('/', complaintController.list);
router.get('/:id', complaintController.getById);

// Admin-only endpoints
router.patch('/:id/status', requireRole(['ADMIN']), complaintController.updateStatus);

export default router;
