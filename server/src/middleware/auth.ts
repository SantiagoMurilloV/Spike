import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { JwtPayload } from '../types';

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

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.substring(7);

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
      try {
        req.user = authService.verifyToken(authHeader.substring(7));
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
