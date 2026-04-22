import bcrypt from 'bcrypt';
import { getPool } from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { BCRYPT_ROUNDS, validatePasswordStrength } from './password';
import { getPresence } from './presence';

/**
 * Super-admin platform operations. Everything here is gated behind
 * `requireRole('super_admin')` at the route layer. Separated from
 * user.service because those endpoints are specifically the admin's
 * judge-management view; this one is the full tenant-level console.
 */

export interface PlatformStats {
  tournaments: number;
  teams: number;
  players: number;
  users: {
    super_admin: number;
    admin: number;
    judge: number;
    total: number;
  };
  /**
   * Live-presence counters, computed from the in-memory presence tracker
   * (services/presence.ts). Both cover roughly the last 5 minutes.
   *
   *   · activeUsers    — logged-in users that made a request recently
   *   · activeVisitors — total unique (ip+user-agent) fingerprints
   *                      including anonymous visitors
   */
  presence: {
    activeUsers: number;
    activeVisitors: number;
  };
}

export interface PlatformUser {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  tournamentQuota: number;
  createdBy?: string | null;
  ownedTournamentsCount: number;
  createdAt?: string;
}

export interface CreatePlatformUserDto {
  username: string;
  password: string;
  role: 'super_admin' | 'admin' | 'judge';
  displayName?: string;
  tournamentQuota?: number;
  /** Only meaningful for judges — which admin they belong to. */
  createdBy?: string | null;
}

export interface UpdatePlatformUserDto {
  role?: 'super_admin' | 'admin' | 'judge';
  tournamentQuota?: number;
  displayName?: string;
  /** Optional rename. Must still be 3+ chars and url-safe. */
  username?: string;
  /** Optional password reset. Must pass the same strength policy as create. */
  password?: string;
}

function mapUser(row: Record<string, unknown>): PlatformUser {
  return {
    id: row.id as string,
    username: row.username as string,
    role: row.role as string,
    displayName: (row.display_name as string | null) ?? undefined,
    tournamentQuota: (row.tournament_quota as number | null) ?? 0,
    createdBy: (row.created_by as string | null) ?? null,
    ownedTournamentsCount: Number(row.owned_count ?? 0),
    createdAt: row.created_at as string | undefined,
  };
}

export class PlatformService {
  /**
   * Dashboard-level rollups. Unique teams are the plain `teams` table
   * count — teams are platform-scoped today even though tournaments
   * aren't. If we ever scope teams per admin we'd filter here.
   */
  async getStats(): Promise<PlatformStats> {
    const pool = getPool();
    // One round-trip: a single query with subselects is cheaper than
    // four sequential counts on a free-tier Postgres.
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM tournaments) AS tournaments,
        (SELECT COUNT(*)::int FROM teams) AS teams,
        (SELECT COUNT(*)::int FROM players) AS players,
        (SELECT COUNT(*)::int FROM users WHERE role = 'super_admin') AS super_admin,
        (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admin,
        (SELECT COUNT(*)::int FROM users WHERE role = 'judge') AS judge
    `);
    const r = result.rows[0] as Record<string, number>;
    return {
      tournaments: r.tournaments,
      teams: r.teams,
      players: r.players,
      users: {
        super_admin: r.super_admin,
        admin: r.admin,
        judge: r.judge,
        total: r.super_admin + r.admin + r.judge,
      },
      presence: getPresence(),
    };
  }

  /**
   * List every user on the platform, ordered by role then creation time,
   * with a per-user count of tournaments they own. This powers the
   * super-admin "Users" table.
   */
  async listUsers(): Promise<PlatformUser[]> {
    const pool = getPool();
    const result = await pool.query(`
      SELECT u.id, u.username, u.role, u.display_name, u.tournament_quota,
             u.created_by, u.created_at,
             COUNT(t.id) AS owned_count
      FROM users u
      LEFT JOIN tournaments t ON t.owner_id = u.id
      GROUP BY u.id
      ORDER BY
        CASE u.role
          WHEN 'super_admin' THEN 0
          WHEN 'admin'       THEN 1
          WHEN 'judge'       THEN 2
          ELSE 3
        END,
        u.created_at DESC
    `);
    return result.rows.map(mapUser);
  }

  async createUser(data: CreatePlatformUserDto): Promise<PlatformUser> {
    const username = (data.username || '').trim();
    const password = data.password || '';
    const role = data.role;
    const displayName = data.displayName?.trim() || null;

    if (username.length < 3) {
      throw new ValidationError('El nombre de usuario debe tener al menos 3 caracteres');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new ValidationError(
        'El nombre de usuario solo puede contener letras, números, puntos, guiones o guiones bajos',
      );
    }
    if (!['super_admin', 'admin', 'judge'].includes(role)) {
      throw new ValidationError('Rol inválido');
    }
    validatePasswordStrength(password);

    const pool = getPool();
    const dup = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username],
    );
    if (dup.rows.length > 0) {
      throw new ValidationError('Ya existe un usuario con ese nombre');
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const tournamentQuota =
      role === 'admin' ? (data.tournamentQuota ?? 1) : 0;
    const createdBy = role === 'judge' ? (data.createdBy ?? null) : null;

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, display_name, tournament_quota, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, hash, role, displayName, tournamentQuota, createdBy],
    );
    return mapUser({ ...result.rows[0], owned_count: 0 });
  }

  async updateUser(id: string, data: UpdatePlatformUserDto): Promise<PlatformUser> {
    const pool = getPool();
    const check = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) throw new NotFoundError('Usuario');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.role !== undefined) {
      if (!['super_admin', 'admin', 'judge'].includes(data.role)) {
        throw new ValidationError('Rol inválido');
      }
      fields.push(`role = $${idx}`);
      values.push(data.role);
      idx++;
    }
    if (data.tournamentQuota !== undefined) {
      if (!Number.isInteger(data.tournamentQuota) || data.tournamentQuota < 0) {
        throw new ValidationError('El cupo de torneos debe ser un entero >= 0');
      }
      fields.push(`tournament_quota = $${idx}`);
      values.push(data.tournamentQuota);
      idx++;
    }
    if (data.displayName !== undefined) {
      fields.push(`display_name = $${idx}`);
      values.push(data.displayName?.trim() || null);
      idx++;
    }
    if (data.username !== undefined) {
      const username = data.username.trim();
      if (username.length < 3) {
        throw new ValidationError('El nombre de usuario debe tener al menos 3 caracteres');
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        throw new ValidationError(
          'El nombre de usuario solo puede contener letras, números, puntos, guiones o guiones bajos',
        );
      }
      // Uniqueness: make sure no OTHER user has this username already.
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, id],
      );
      if (dup.rows.length > 0) {
        throw new ValidationError('Ya existe un usuario con ese nombre');
      }
      fields.push(`username = $${idx}`);
      values.push(username);
      idx++;
    }
    if (data.password !== undefined && data.password !== '') {
      validatePasswordStrength(data.password);
      const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
      fields.push(`password_hash = $${idx}`);
      values.push(hash);
      idx++;
    }

    if (fields.length === 0) {
      // nothing to update — return the current row enriched
      return this.getUserById(id);
    }
    fields.push('updated_at = NOW()');
    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
      values,
    );
    return this.getUserById(id);
  }

  private async getUserById(id: string): Promise<PlatformUser> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.*, COUNT(t.id) AS owned_count
       FROM users u
       LEFT JOIN tournaments t ON t.owner_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id],
    );
    if (result.rows.length === 0) throw new NotFoundError('Usuario');
    return mapUser(result.rows[0]);
  }

  /**
   * Delete a user.
   * Guards:
   *   · cannot delete yourself (avoids accidental lockout)
   *   · cannot delete the last super_admin (avoids platform lockout)
   */
  async deleteUser(id: string, callerUserId: string): Promise<void> {
    if (id === callerUserId) {
      throw new ValidationError('No podés eliminar tu propio usuario');
    }
    const pool = getPool();
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) throw new NotFoundError('Usuario');
    if (target.rows[0].role === 'super_admin') {
      const others = await pool.query(
        "SELECT COUNT(*)::int AS n FROM users WHERE role = 'super_admin' AND id != $1",
        [id],
      );
      if (others.rows[0].n === 0) {
        throw new ValidationError(
          'No se puede eliminar el último super administrador del sistema',
        );
      }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

export const platformService = new PlatformService();
