import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import { JwtPayload, LoginRequest, LoginResponse } from '../types';
import { UnauthorizedError } from '../middleware/errorHandler';

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
const BCRYPT_ROUNDS = 10;

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [credentials.username]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(credentials.password, user.password_hash);

    if (!validPassword) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const payload = { userId: user.id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    return {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const pool = getPool();
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, userId]
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
