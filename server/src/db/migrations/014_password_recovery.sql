-- Password recovery column for the super-admin's "see current password"
-- feature. Stores an AES-256-GCM ciphertext whose key lives OUTSIDE
-- the database (in the PLATFORM_RECOVERY_KEY env var on Railway).
--
-- SECURITY WARNING: enabling this feature (setting PLATFORM_RECOVERY_KEY)
-- means a DB leak + env leak exposes every password. Without the env
-- var set, the column stays NULL and the feature is inert — the app
-- falls back to the show-once reset flow. This is documented in
-- DEPLOY.md and surfaced in the super-admin console header.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_recovery TEXT;
