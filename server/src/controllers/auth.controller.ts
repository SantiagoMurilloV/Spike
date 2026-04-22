import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
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

export async function logout(_req: Request, res: Response): Promise<void> {
  // JWT is stateless — logout is handled client-side by discarding the token
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
