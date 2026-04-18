import { Request, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { validateUUID } from '../middleware/validation';

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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
