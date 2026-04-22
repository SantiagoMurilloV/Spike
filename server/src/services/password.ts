import { ValidationError } from '../middleware/errorHandler';

/**
 * Shared password validation + hashing policy. Keeping it in one file so
 * auth.service (admin change-password) and user.service (judge create /
 * admin password reset) both apply the same rules — no weak passwords
 * slipping in through a secondary flow.
 *
 * Policy:
 *   · minimum 8 characters
 *   · must contain at least one letter AND one digit (rejects "12345678"
 *     and "password")
 *   · bcrypt 12 rounds (~2^12 iterations; 4× slower than 10, ~300 ms on
 *     commodity hardware — adds ~150 ms per login, acceptable)
 *
 * Raise BCRYPT_ROUNDS (or add an ENV override) only after benchmarking
 * Railway cold-CPU latency; higher rounds make login slow enough to feel
 * broken.
 */

export const BCRYPT_ROUNDS = 12;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bcrypt hard cap is 72 bytes; reject before that

export function validatePasswordStrength(password: string, label = 'contraseña'): void {
  if (typeof password !== 'string') {
    throw new ValidationError(`La ${label} es inválida`);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `La ${label} debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `La ${label} no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres`,
    );
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    throw new ValidationError(
      `La ${label} debe incluir al menos una letra y un número`,
    );
  }
}
