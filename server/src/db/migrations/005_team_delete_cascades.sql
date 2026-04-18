-- Add CASCADE / SET NULL behavior on team foreign keys so that deleting a
-- team cleans up its historical data (matches, standings) without requiring
-- an application-level transaction. This lets team.service.delete() perform
-- a single DELETE and relies on PostgreSQL's referential integrity.

-- matches.team1_id / matches.team2_id → CASCADE
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team2_id_fkey;
ALTER TABLE matches
  ADD CONSTRAINT matches_team1_id_fkey
  FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE matches
  ADD CONSTRAINT matches_team2_id_fkey
  FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE;

-- standings.team_id → CASCADE
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_team_id_fkey;
ALTER TABLE standings
  ADD CONSTRAINT standings_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- bracket_matches.team*_id and winner_id → SET NULL (placeholders remain)
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team1_id_fkey;
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_team2_id_fkey;
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_winner_id_fkey;
ALTER TABLE bracket_matches
  ADD CONSTRAINT bracket_matches_team1_id_fkey
  FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE bracket_matches
  ADD CONSTRAINT bracket_matches_team2_id_fkey
  FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE bracket_matches
  ADD CONSTRAINT bracket_matches_winner_id_fkey
  FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL;
