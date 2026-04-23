import { Request, Response, NextFunction } from 'express';
import { teamService } from '../services/team.service';
import { validateUUID } from '../middleware/validation';

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await teamService.getAll();
    res.json(teams);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de equipo');
    const team = await teamService.getById(id);
    res.json(team);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await teamService.create(req.body);
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de equipo');
    const team = await teamService.update(id, req.body);
    res.json(team);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de equipo');
    await teamService.delete(id);
    res.json({ message: 'Equipo eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
}

export async function getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de equipo');
    const matches = await teamService.getMatches(id);
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/teams/:teamId/credentials
 *
 * Generates (or regenerates) login credentials for the team's captain.
 * Response body is the plaintext receipt — the FE shows it once in the
 * show-once modal and then drops it. Requires an admin (or super_admin)
 * JWT; enforced by requireRole at the router level.
 */
export async function generateCredentials(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teamId = req.params.teamId as string;
    validateUUID(teamId, 'ID de equipo');
    const receipt = await teamService.generateCaptainCredentials(teamId);
    res.status(201).json(receipt);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/teams/:teamId/credentials
 *
 * Admin-only lookup that returns the team's current captain credentials.
 * When PLATFORM_RECOVERY_KEY is set the plaintext password is decrypted
 * on demand from the AES-256-GCM blob; otherwise `password` is null and
 * the UI falls back to "regenerar para ver la contraseña".
 *
 * 404 when no credentials have been generated yet for this team.
 */
export async function getCredentials(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const teamId = req.params.teamId as string;
    validateUUID(teamId, 'ID de equipo');
    const receipt = await teamService.getCaptainCredentials(teamId);
    if (!receipt) {
      res.status(404).json({ error: 'Este equipo no tiene credenciales generadas' });
      return;
    }
    res.json(receipt);
  } catch (error) {
    next(error);
  }
}
