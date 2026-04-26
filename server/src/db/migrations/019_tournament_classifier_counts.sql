-- Per-group classifier counts for `bracket_mode = 'divisions'` torneos.
--
-- The auto-bracket flow used to hardcode "top 2 → Oro, 3rd–4th → Plata"
-- for every category. That worked when groups had exactly 4 teams but
-- broke down on tournaments with 5+ teams per group (10 classifiers in
-- a 16-slot bracket = 6 byes, ugly cascade) or smaller groups (3 teams
-- per group → no 4th place at all, so Plata silently dropped).
--
-- These two columns let the admin pick how many teams from each group
-- advance to each division at tournament-creation time:
--
--   · gold_classifiers_per_group   → top N go to Oro     (default 2)
--   · silver_classifiers_per_group → next M go to Plata  (default 2)
--
-- Total classifiers per category = (gold + silver) * groupCount, which
-- now lets the admin steer the bracket size to a clean power of two.
-- Setting silver = 0 disables Plata entirely.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS gold_classifiers_per_group INT DEFAULT 2
    CHECK (gold_classifiers_per_group >= 1 AND gold_classifiers_per_group <= 8),
  ADD COLUMN IF NOT EXISTS silver_classifiers_per_group INT DEFAULT 2
    CHECK (silver_classifiers_per_group >= 0 AND silver_classifiers_per_group <= 8);
