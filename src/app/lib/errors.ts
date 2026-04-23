/**
 * Centralised error-message extractor used everywhere we catch
 * unknown errors and show a user-facing toast / inline message.
 *
 * Replaces the pattern `err instanceof Error ? err.message : 'fallback'`
 * which appeared verbatim in 20+ call sites before the audit.
 *
 * Handles:
 *   · `Error` instances (most common — thrown by fetch/JSON parse)
 *   · `ApiError` (subclass of Error — picked up by the `.message` read)
 *   · Plain strings thrown by some legacy server validators
 *   · Anything else → the caller's fallback string
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim().length > 0) return err;
  return fallback;
}
