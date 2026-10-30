import { Router } from 'express';
import { complaintController } from '../controllers/complaintController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// All complaint endpoints require an authenticated session
router.use(requireAuth);

// Evidence upload endpoint (supports Cloudinary and local storage)
router.post('/evidence/upload', upload.single('file'), complaintController.uploadEvidence);

// Citizen & Admin endpoints
router.post('/', complaintController.create);
router.get('/', complaintController.list);
router.get('/:id', complaintController.getById);
router.get('/:id/evidence/:evidenceId', complaintController.getEvidence);

// Admin-only endpoints
router.patch('/:id/status', requireRole(['ADMIN']), complaintController.updateStatus);

export default router;
