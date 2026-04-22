import bcrypt from 'bcrypt';
import { getPool } from '../config/database';
import { BCRYPT_ROUNDS } from './password';

/**
 * Ensures a `super_admin` user exists. Called once at boot after the
 * migrations run. Reads:
 *
 *   SUPER_ADMIN_USERNAME  (optional, default "superadmin")
 *   SUPER_ADMIN_PASSWORD  (required in production; dev fallback allowed)
 *
 * Never overwrites an existing super_admin — if one is already in the
 * DB (e.g. password was changed since bootstrap), we leave it alone.
 * Idempotent: safe to call on every boot.
 */
export async function ensureSuperAdmin(): Promise<void> {
  const pool = getPool();

  const existing = await pool.query(
    "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1",
  );
  if (existing.rows.length > 0) return;

  const username = (process.env.SUPER_ADMIN_USERNAME ?? 'superadmin').trim();
  const envPassword = process.env.SUPER_ADMIN_PASSWORD;

  let password: string;
  if (envPassword && envPassword.length >= 8) {
    password = envPassword;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[bootstrap] SUPER_ADMIN_PASSWORD is required in production (>=8 chars). ' +
        'Set it in Railway env vars before redeploying.',
    );
  } else {
    password = 'spkcup-superadmin-dev-123';
    console.warn(
      `[bootstrap] SUPER_ADMIN_PASSWORD not set — using dev default. ` +
        `Username: ${username}, password: ${password}. ` +
        `NEVER deploy without setting SUPER_ADMIN_PASSWORD in prod.`,
    );
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await pool.query(
    `INSERT INTO users (username, password_hash, role, display_name, tournament_quota)
     VALUES ($1, $2, 'super_admin', 'Super Administrator', 0)
     ON CONFLICT (username) DO NOTHING`,
    [username, hash],
  );

  console.log(`[bootstrap] super_admin user ensured (username: ${username})`);
}
