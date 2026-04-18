import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ValidationError } from '../middleware/errorHandler';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    const result = await authService.login({ username, password });
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
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const userId = req.user!.userId;
    await authService.changePassword(userId, newPassword);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
}
