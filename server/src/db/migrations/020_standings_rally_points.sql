-- Cumulative rally-point totals on the standings table.
--
-- The public Clasificación tab (StandingsTab.tsx) uses the standard
-- FIVB tiebreaker cascade — points → set diff → **rally-point ratio**
-- (pointsFor / pointsAgainst) → setsFor → wins → group position →
-- name. The frontend computes the rally totals on the fly from each
-- match's `set_scores` row, but the bracket-side ranking
-- (`compareRankingRows` / `computeCumulativeRanking`) only had access
-- to the columns persisted on `standings`, so it skipped the rally
-- step entirely.
--
-- Symptom: when two teams tied on points + set diff + setsFor + wins,
-- the public table picked a winner by rally ratio (e.g. LOBAS DE 7 pts
-- 5/4 sets 201/198 ranked above CÓNDOR DE 7 pts 5/4 sets 189/193), but
-- the bracket fell through to `team_id` UUID order and could put
-- CÓNDOR ahead — which is exactly what showed up as "la clasificación
-- y el bracket no coinciden".
--
-- Persisting the rally totals here lets every backend ranker use the
-- same cascade as the public table without recomputing from set_scores
-- on every bracket re-seed.
--
-- Defaults to 0 so existing rows keep working until the next
-- standings recalc (which fires automatically on every score write
-- via match.service.refreshTournamentState).

ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS points_for INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_against INT NOT NULL DEFAULT 0;
