import { Router } from 'express';
import { login, logout, changePassword, me } from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rateLimit';
import { requireRole } from '../middleware/auth';

const router = Router();

// Login is the single entry point for brute-force attacks, so we
// throttle it per (ip, username) before bcrypt.compare even runs.
// The controller itself calls loginRateLimiter.clear() on success so a
// legitimate user isn't locked out after 5 successful logins.
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.put('/password', changePassword);
// /me is authenticated (any role) and exposes the caller's own profile
// including tournament quota — frontend uses it to render the "X/Y
// torneos de tu plan" indicator.
router.get('/me', requireRole('super_admin', 'admin', 'judge'), me);

export default router;
