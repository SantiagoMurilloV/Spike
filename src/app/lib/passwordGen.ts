/**
 * Human-readable random passwords for super-admin resets.
 *
 * Goals:
 *   · Passes our backend policy (≥8 chars, ≥1 letter, ≥1 digit)
 *   · Easy to read over the phone / copy to WhatsApp without ambiguity
 *     (no 0/O, no 1/l/I mix-ups)
 *   · Memorable shape: Word-Word-NNNN
 *
 * Entropy: ~12 words × 12 words × 10 000 = ~1.4M combinations. Fine
 * for short-lived temp passwords — the real password is whatever the
 * user sets later.
 */

const WORDS = [
  'Volei',
  'Spike',
  'Saque',
  'Remate',
  'Bloque',
  'Pase',
  'Match',
  'Rally',
  'Tigre',
  'Puma',
  'Condor',
  'Halcon',
] as const;

/** Pick one element from an array using `crypto.getRandomValues`. */
function pick<T>(arr: readonly T[]): T {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  return arr[buf[0] % arr.length];
}

/** 4-digit number, no leading zero. */
function fourDigits(): string {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  return String(1000 + (buf[0] % 9000));
}

export function generatePassword(): string {
  return `${pick(WORDS)}-${pick(WORDS)}-${fourDigits()}`;
}
