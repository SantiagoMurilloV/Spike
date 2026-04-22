import crypto from 'crypto';

/**
 * Password-recovery helper. OPT-IN via the PLATFORM_RECOVERY_KEY env var.
 *
 *   · Key is 64 hex chars (32 bytes) generated with `openssl rand -hex 32`.
 *   · Every password set anywhere in the app (create user, reset password,
 *     self-change) is encrypted with AES-256-GCM and stored in
 *     users.password_recovery alongside the bcrypt hash.
 *   · Super_admin endpoint decrypts the value on demand.
 *
 * SECURITY POSTURE (what we accept by enabling this):
 *   · A DB leak + env leak → every password in plaintext. Mitigation:
 *     keep the key only in Railway's env vars, never in source, never
 *     in logs. Rotate if you suspect compromise.
 *   · A compromised super_admin account → the attacker can fetch every
 *     user's password via /api/platform/users/:id/password. Mitigation:
 *     strong super_admin password, idle auto-logout (already in place),
 *     consider 2FA later.
 *   · If the env var is LOST/CHANGED → existing ciphertexts become
 *     permanently unreadable. Password logins still work (bcrypt hash is
 *     independent), but the "see current password" feature won't show
 *     anything until each password is reset again.
 *
 * WITHOUT THE ENV VAR set the whole feature is a no-op: encrypt returns
 * null, decrypt returns null, super_admin sees the normal show-once flow.
 */

const ALG = 'aes-256-gcm';
const IV_LEN = 12; // recommended for GCM

function getKey(): Buffer | null {
  const hex = (process.env.PLATFORM_RECOVERY_KEY ?? '').trim();
  if (hex.length !== 64) return null;
  try {
    return Buffer.from(hex, 'hex');
  } catch {
    return null;
  }
}

export function isRecoveryEnabled(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a plaintext password for recovery storage. Returns an
 * `iv:ciphertext:tag` hex string, or null if the feature is disabled —
 * in which case callers should leave password_recovery NULL.
 */
export function encryptPassword(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt a stored ciphertext. Returns null when the feature is disabled,
 * the value is missing/malformed, or the auth tag fails (tamper or
 * wrong key).
 */
export function decryptPassword(enc: string | null | undefined): string | null {
  const key = getKey();
  if (!key || !enc) return null;
  const parts = enc.split(':');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const ct = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
