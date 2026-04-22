import { Request, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { validateUUID } from '../middleware/validation';
import { optionalUser } from '../middleware/auth';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Scope per caller role:
    //   · judge      → only LIVE matches from tournaments owned by their creator admin
    //   · admin      → all matches from their own tournaments
    //   · super_admin / public → everything
    const caller = optionalUser(req);
    if (caller?.role === 'judge' && caller.createdBy) {
      const matches = await matchService.getAll({
        scope: 'judge',
        judgeCreatedBy: caller.createdBy,
      });
      res.json(matches);
      return;
    }
    if (caller?.role === 'admin') {
      const matches = await matchService.getAll({
        scope: 'owner',
        ownerId: caller.userId,
      });
      res.json(matches);
      return;
    }
    const matches = await matchService.getAll();
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de partido');
    const match = await matchService.getById(id);
    res.json(match);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const match = await matchService.create(req.body);
    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de partido');
    const match = await matchService.update(id, req.body);
    res.json(match);
  } catch (error) {
    next(error);
  }
}

export async function updateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de partido');
    const match = await matchService.updateScore(id, req.body);
    res.json(match);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de partido');
    await matchService.delete(id);
    res.json({ message: 'Partido eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
}
