import bcrypt from 'bcrypt';
import { getPool } from '../config/database';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import { BCRYPT_ROUNDS, validatePasswordStrength } from './password';

/**
 * App user. Today we have two roles:
 *  - 'admin'  → full control over tournaments, teams, matches, users.
 *  - 'judge'  → can score live matches (no tournament / team / user CRUD).
 */
export interface AppUser {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJudgeDto {
  username: string;
  password: string;
  displayName?: string;
}

function mapUserRow(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    username: row.username as string,
    role: row.role as string,
    displayName: (row.display_name as string | null) ?? undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

export class UserService {
  /** Return every user with the 'judge' role, newest first. */
  async listJudges(): Promise<AppUser[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, username, role, display_name, created_at, updated_at
       FROM users
       WHERE role = 'judge'
       ORDER BY created_at DESC`,
    );
    return result.rows.map(mapUserRow);
  }

  /** Create a new judge user with bcrypt-hashed password. */
  async createJudge(data: CreateJudgeDto): Promise<AppUser> {
    const username = (data.username || '').trim();
    const password = data.password || '';
    const displayName = data.displayName?.trim() || null;

    if (username.length < 3) {
      throw new ValidationError('El nombre de usuario debe tener al menos 3 caracteres');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new ValidationError(
        'El nombre de usuario solo puede contener letras, números, puntos, guiones o guiones bajos',
      );
    }
    validatePasswordStrength(password);

    const pool = getPool();

    // Uniqueness check up front so we can give a friendly message instead
    // of relying on a Postgres unique-violation error.
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username],
    );
    if (existing.rows.length > 0) {
      throw new ValidationError('Ya existe un usuario con ese nombre');
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, 'judge', $3)
       RETURNING id, username, role, display_name, created_at, updated_at`,
      [username, hash, displayName],
    );
    return mapUserRow(result.rows[0]);
  }

  /** Delete a judge by id. Refuses to delete non-judge accounts. */
  async deleteJudge(id: string): Promise<void> {
    const pool = getPool();
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario');
    }
    const user = result.rows[0];
    if (user.role !== 'judge') {
      throw new ValidationError('Solo se pueden eliminar usuarios juez');
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  /** Reset a judge's password. Admin-only recovery flow. */
  async resetJudgePassword(id: string, newPassword: string): Promise<void> {
    validatePasswordStrength(newPassword);
    const pool = getPool();
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario');
    }
    if (result.rows[0].role !== 'judge') {
      throw new ValidationError('Solo se puede resetear la contraseña de usuarios juez');
    }
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, id],
    );
  }
}

export const userService = new UserService();
