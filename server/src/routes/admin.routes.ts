import { Router } from 'express';
import { resetData } from '../controllers/admin.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * Admin-only destructive ops. All gated behind `requireRole('admin')` so
 * judges (and anyone without a token) get 403.
 */
router.post('/reset-data', requireRole('admin'), resetData);

export default router;
