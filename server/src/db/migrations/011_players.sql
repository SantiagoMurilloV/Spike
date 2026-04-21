-- Team roster / plantel. One row per jugadora enrolled on a team.
--
-- Photos and the document PDF are stored as base64 data URLs in TEXT
-- columns — same strategy we use for team / tournament logos — so they
-- survive Railway redeploys without needing external storage.
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    birth_year INT,
    document_type VARCHAR(10),   -- 'TI' | 'CC' | 'CE' | …
    document_number VARCHAR(40),
    category VARCHAR(50),
    position VARCHAR(50),
    photo TEXT,                   -- base64 data URL
    document_file TEXT,           -- base64 data URL (PDF)
    shirt_number INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS players_team_id_idx ON players(team_id);
