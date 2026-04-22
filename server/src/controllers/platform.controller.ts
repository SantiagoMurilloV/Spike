import { Request, Response, NextFunction } from 'express';
import { platformService } from '../services/platform.service';
import { validateUUID } from '../middleware/validation';

/**
 * HTTP handlers for the super_admin control panel. All routes are gated
 * by `requireRole('super_admin')` at the router — the controller itself
 * doesn't re-check because that would just duplicate middleware.
 */

export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await platformService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await platformService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await platformService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de usuario');
    const user = await platformService.updateUser(id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de usuario');
    // requireRole('super_admin') populated req.user already
    await platformService.deleteUser(id, req.user!.userId);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    next(err);
  }
}

/**
 * Reveal the stored-plaintext password of a user. Only works when the
 * recovery feature is on (PLATFORM_RECOVERY_KEY env var set) AND the
 * target user has a ciphertext on file. Super_admin-gated at the route.
 */
export async function revealPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de usuario');
    const result = await platformService.revealPassword(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
