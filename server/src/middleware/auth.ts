import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { isRevoked } from '../services/tokenBlacklist';
import { JwtPayload } from '../types';

/**
 * Best-effort decode of the Authorization header for public endpoints
 * that need to scope their response by role (e.g. GET /tournaments
 * returns every tournament to anonymous spectators but only the caller's
 * own tournaments to an authenticated admin). Returns null when there's
 * no token, it's revoked, or it fails to verify — never throws so
 * callers can `??`/`?.` freely.
 */
export function optionalUser(req: Request): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (isRevoked(token)) return null;
  try {
    return authService.verifyToken(token);
  } catch {
    return null;
  }
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * - GET requests are public (no auth required)
 * - POST /api/auth/login is public
 * - All other POST, PUT, DELETE require a valid JWT
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow all GET requests without auth
  if (req.method === 'GET') {
    return next();
  }

  // Allow login endpoint without auth
  if (req.method === 'POST' && req.path === '/api/auth/login') {
    return next();
  }

  // Public push (un)subscribe — spectators without accounts still need to
  // opt into live-match notifications. The endpoints are anonymous-safe:
  // they only persist the browser's own subscription and can't disclose
  // anything. We still best-effort decode the token so authed users get
  // their `userId` / `role` attached to the subscription row.
  if (
    req.method === 'POST' &&
    (req.path === '/api/push/subscribe' || req.path === '/api/push/unsubscribe')
  ) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        req.user = authService.verifyToken(authHeader.substring(7));
      } catch {
        // token is bad — fine, we still let them subscribe anonymously
      }
    }
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.substring(7);

  // Revocation check first — if the user logged out or the admin was
  // force-logged-out for inactivity we refuse the token even though it
  // hasn't hit its natural `exp` yet.
  if (isRevoked(token)) {
    res.status(401).json({ error: 'Sesión cerrada. Iniciá sesión de nuevo.' });
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Require a specific role on the authenticated user.
 *
 * The global `authMiddleware` lets GETs through without a token (the public
 * frontend reads tournaments, standings, etc. anonymously), which means
 * `req.user` is missing on GETs. This wrapper verifies the Bearer token
 * itself when needed so it can be layered onto any route — GET included —
 * to require authentication + a specific role.
 *
 *   router.get('/…',  requireRole('admin'),         handler)
 *   router.post('/…', requireRole('admin','judge'), handler)
 */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // If the token wasn't validated earlier (e.g. this is a GET), do it now.
    if (!req.user) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticación requerido' });
        return;
      }
      const token = authHeader.substring(7);
      if (isRevoked(token)) {
        res.status(401).json({ error: 'Sesión cerrada. Iniciá sesión de nuevo.' });
        return;
      }
      try {
        req.user = authService.verifyToken(token);
      } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
        return;
      }
    }

    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({
        error: 'No tenés permiso para realizar esta acción',
      });
      return;
    }
    next();
  };
}
