import { Router } from 'express';
import {
  vapidPublicKey,
  subscribe,
  unsubscribe,
} from '../controllers/push.controller';

const router = Router();

/**
 * Push routes. All paths are public:
 *  - GET  /vapid-public-key   → used by every browser/app to enroll.
 *  - POST /subscribe          → called after the user grants permission.
 *  - POST /unsubscribe        → called when the browser revokes / PWA
 *                                reinstalls.
 *
 * The global `authMiddleware` already allows GET without a token; the two
 * POSTs normally require a JWT but we whitelist them in index.ts so public
 * spectators can subscribe without signing up.
 */
router.get('/vapid-public-key', vapidPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

export default router;
