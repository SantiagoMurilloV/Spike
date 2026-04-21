import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

/**
 * Wipe every data table except users, push subscriptions and app config.
 * Requires the admin role (enforced at the router via `requireRole`).
 */
export async function resetData(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminService.resetData();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
