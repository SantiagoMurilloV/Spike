-- Bracket-stage matches now materialize into the regular `matches` table.
--
-- Until this migration, every cuartos / semifinal / final / tercer-puesto
-- match lived only inside `bracket_matches`. The public `MatchesTab` and
-- the referee/admin score flows operate on `matches`, so bracket rounds
-- never showed up there. This column wires the two tables together so
-- the materializer can:
--
--   · Tell whether a bracket slot already produced a match row
--     (idempotency — the materializer runs after every score update).
--   · Cascade a `matches` row deletion to the bracket pointer (set null)
--     so the bracket doesn't keep a dangling reference if an admin
--     manually deletes a materialized match.
--
-- ON DELETE SET NULL is intentional: deleting the bracket row should not
-- silently nuke a played match (with sets and history); it just orphans
-- the link so the materializer can re-create it next pass.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_match_id UUID
    REFERENCES bracket_matches(id) ON DELETE SET NULL;

-- One materialized match per bracket slot. Partial index because most
-- matches are group-stage and never carry a bracket pointer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_bracket_match_id_unique
  ON matches (bracket_match_id)
  WHERE bracket_match_id IS NOT NULL;
