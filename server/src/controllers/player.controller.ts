import { Request, Response, NextFunction } from 'express';
import { playerService } from '../services/player.service';
import { validateUUID } from '../middleware/validation';

/**
 * Players controller. Routes are nested under a team — see
 * `/api/teams/:teamId/players` in `team.routes.ts`. The team ID comes from
 * `req.params.teamId` for list/create; individual record ops use
 * `req.params.playerId`.
 */

export async function listByTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = req.params.teamId as string;
    validateUUID(teamId, 'ID de equipo');
    const players = await playerService.listByTeam(teamId);
    res.json(players);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.playerId as string;
    validateUUID(id, 'ID de jugadora');
    const player = await playerService.getById(id);
    res.json(player);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = req.params.teamId as string;
    validateUUID(teamId, 'ID de equipo');
    const player = await playerService.create({ ...req.body, teamId });
    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.playerId as string;
    validateUUID(id, 'ID de jugadora');
    const player = await playerService.update(id, req.body);
    res.json(player);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.playerId as string;
    validateUUID(id, 'ID de jugadora');
    await playerService.delete(id);
    res.json({ message: 'Jugadora eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
}
