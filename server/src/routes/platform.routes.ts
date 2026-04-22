import { Router } from 'express';
import {
  getStats,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/platform.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * Every endpoint under /api/platform is super_admin-only. requireRole
 * handles both authentication (bearer token) and authorisation (correct
 * role) so routes stay declarative.
 */
router.get('/stats', requireRole('super_admin'), getStats);
router.get('/users', requireRole('super_admin'), listUsers);
router.post('/users', requireRole('super_admin'), createUser);
router.put('/users/:id', requireRole('super_admin'), updateUser);
router.delete('/users/:id', requireRole('super_admin'), deleteUser);

export default router;
