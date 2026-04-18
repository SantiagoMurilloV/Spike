import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';

export async function getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.get();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.update(req.body);
    res.json(settings);
  } catch (error) {
    next(error);
  }
}
