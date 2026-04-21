import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validateUUID } from '../middleware/validation';

export async function listJudges(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const judges = await userService.listJudges();
    res.json(judges);
  } catch (error) {
    next(error);
  }
}

export async function createJudge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const judge = await userService.createJudge(req.body);
    res.status(201).json(judge);
  } catch (error) {
    next(error);
  }
}

export async function deleteJudge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de juez');
    await userService.deleteJudge(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function resetJudgePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de juez');
    const newPassword = (req.body as { password?: string }).password || '';
    await userService.resetJudgePassword(id, newPassword);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
