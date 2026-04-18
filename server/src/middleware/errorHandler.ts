import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} no fue encontrado`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class DatabaseError extends AppError {
  constructor() {
    super(503, 'Servicio temporalmente no disponible');
    this.name = 'DatabaseError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // PostgreSQL connection errors
  if (
    err.message?.includes('ECONNREFUSED') ||
    err.message?.includes('connection terminated') ||
    err.message?.includes('Connection terminated')
  ) {
    res.status(503).json({ error: 'Servicio temporalmente no disponible' });
    return;
  }

  // Fallback
  res.status(500).json({ error: 'Error interno del servidor' });
}
