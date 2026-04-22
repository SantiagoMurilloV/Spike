-- Platform multitenancy: introduces a SaaS layer where
--
--   super_admin → owns the platform (Santiago). Sees everything, CRUDs users,
--                 sets per-admin tournament quotas.
--   admin      → tenant. Creates + runs their own tournaments and judges.
--                 Capped by `tournament_quota`.
--   judge      → scoped to the tournaments of the admin that created them.
--                Sees only LIVE matches within that scope.
--
-- Existing data gets backfilled so the first admin user silently owns all
-- legacy tournaments.

-- How many tournaments this user is allowed to create. Only consulted for
-- role='admin' (super_admin ignores it, judge doesn't create tournaments).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tournament_quota INT NOT NULL DEFAULT 1;

-- Which user created this one. For judges this points at the admin whose
-- tournaments they can score; NULL for admins (self-created via platform)
-- and super_admins (bootstrapped).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_created_by_idx ON users(created_by);

-- Which admin "owns" this tournament. Public reads (GET /tournaments with
-- no auth) still see all of them — this only scopes the admin dashboard.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tournaments_owner_id_idx ON tournaments(owner_id);

-- Backfill: tournaments that existed before multitenancy become owned by the
-- oldest admin so the admin dashboard isn't suddenly empty after the
-- migration runs. If there's no admin (fresh DB) they stay NULL and only
-- super_admin can see them.
UPDATE tournaments SET owner_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE owner_id IS NULL;
