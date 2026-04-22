import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { revokeToken } from '../services/tokenBlacklist';
import { ValidationError } from '../middleware/errorHandler';
import { loginRateLimiter } from '../middleware/rateLimit';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    const result = await authService.login({ username, password });
    // Success — reset this user's rate-limit bucket so five legitimate
    // logins in a session (e.g. admin testing judge accounts) don't lock
    // them out. Failed attempts still accumulate.
    loginRateLimiter.clear(req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Revoke the bearer token so it's rejected even if someone kept a
  // copy. JWT is stateless so this lives in an in-memory blacklist —
  // enough for our single Railway instance + 24h token lifetime.
  //
  // The authMiddleware already validated the token, so if we got here
  // `req.user` is set and the token is good. We pull the raw token from
  // the header and add its SHA-256 hash to the blacklist alongside the
  // token's own `exp` so the janitor can drop it when it would've
  // expired anyway.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && req.user?.exp) {
    revokeToken(authHeader.substring(7), req.user.exp);
  }
  res.json({ message: 'Sesión cerrada exitosamente' });
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      throw new ValidationError('La contraseña actual es requerida');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      throw new ValidationError('La nueva contraseña es requerida');
    }

    const userId = req.user!.userId;
    // auth.service validates strength + checks current password
    await authService.changePassword(userId, currentPassword, newPassword);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
}
