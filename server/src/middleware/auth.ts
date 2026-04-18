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
