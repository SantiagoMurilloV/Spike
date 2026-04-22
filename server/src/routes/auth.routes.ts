import { Router } from 'express';
import { login, logout, changePassword } from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Login is the single entry point for brute-force attacks, so we
// throttle it per (ip, username) before bcrypt.compare even runs.
// The controller itself calls loginRateLimiter.clear() on success so a
// legitimate user isn't locked out after 5 successful logins.
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.put('/password', changePassword);

export default router;
