import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import { JwtPayload, LoginRequest, LoginResponse } from '../types';
import { UnauthorizedError } from '../middleware/errorHandler';
import { BCRYPT_ROUNDS, validatePasswordStrength } from './password';
import { encryptPassword } from './passwordRecovery';

// JWT_SECRET is required in production. A weak fallback is only allowed in dev/test.
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is missing or too short (<16 chars). Refusing to start in production.',
    );
  }

  // Dev/test fallback. NEVER commit this as a production default.
  console.warn(
    '[auth] JWT_SECRET env var is missing or weak — using a development fallback. ' +
      'Set a strong JWT_SECRET (>=16 chars) before deploying.',
  );
  return 'spkcup-dev-only-secret-do-not-use-in-prod';
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRATION = '24h';

/**
 * Dummy bcrypt hash used to equalize timing on login when the username
 * doesn't exist. Without this, a missing user returns ~1 ms while a
 * wrong password takes ~150 ms (bcrypt.compare), which leaks username
 * existence via response-time side channel. Running a fake compare
 * against a constant hash makes both paths take the same time.
 *
 * The plaintext "never-matches" is irrelevant — this is only used as
 * the haystack for bcrypt.compare with whatever the attacker sent.
 */
const DUMMY_BCRYPT_HASH = bcrypt.hashSync(
  'spkcup-timing-equalizer-never-matches',
  10,
);

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, password_hash, role, created_by FROM users WHERE username = $1',
      [credentials.username],
    );

    // Constant-time path: always run bcrypt.compare() once, regardless of
    // whether the user exists. Otherwise a "user not found" shortcut
    // returns in ~1 ms vs ~150 ms for a wrong password, which leaks
    // username enumeration through timing.
    const user = result.rows[0];
    const hashToCheck = user?.password_hash ?? DUMMY_BCRYPT_HASH;
    const validPassword = await bcrypt.compare(credentials.password, hashToCheck);

    if (!user || !validPassword) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    // `createdBy` goes into the token so judge-scoped queries (live
    // match feed) don't have to hit the users table on every request.
    const payload = {
      userId: user.id,
      role: user.role,
      createdBy: user.created_by ?? null,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    return {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  /**
   * Change the password of the currently authenticated user. Requires the
   * caller to confirm their current password so a stolen JWT alone cannot
   * lock out the real owner.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    validatePasswordStrength(newPassword, 'nueva contraseña');

    const pool = getPool();
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );
    if (result.rows.length === 0) {
      throw new UnauthorizedError('Usuario no encontrado');
    }
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      throw new UnauthorizedError('Contraseña actual incorrecta');
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Keep the encrypted recovery ciphertext in sync so super_admin's
    // "reveal current password" stays accurate. Null when the feature
    // is off (no PLATFORM_RECOVERY_KEY).
    const recovery = encryptPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_recovery = $2, updated_at = NOW() WHERE id = $3',
      [hash, recovery, userId],
    );
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }
}

export const authService = new AuthService();
