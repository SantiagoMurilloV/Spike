-- Team-captain credentials for the /team-panel login flow (fase 2).
--
-- Each team gets an opt-in set of credentials generated on-demand from the
-- admin console ("Generar credenciales" button on TeamRosterCard). The
-- captain uses these to log into a future /team-panel where they can
-- register jugador@s themselves — scoped to their team only.
--
-- Columns mirror the users table:
--   captain_username          → human-typable handle (lowercase, unique)
--   captain_password_hash     → bcrypt(password, 12)
--   captain_password_recovery → AES-256-GCM ciphertext, key in env
--                               (PLATFORM_RECOVERY_KEY) — same pattern as
--                               migration 014 for users. NULL when the
--                               recovery feature is disabled.
--   credentials_generated_at  → TIMESTAMPTZ, lets the UI surface "regenerada
--                               el dd/mm/yyyy" and gates the show-once modal.
--
-- UNIQUE on captain_username because login will query it. Partial index
-- (WHERE NOT NULL) so teams without credentials don't collide on NULL.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS captain_username VARCHAR(64),
  ADD COLUMN IF NOT EXISTS captain_password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS captain_password_recovery TEXT,
  ADD COLUMN IF NOT EXISTS credentials_generated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_captain_username
  ON teams (captain_username)
  WHERE captain_username IS NOT NULL;
