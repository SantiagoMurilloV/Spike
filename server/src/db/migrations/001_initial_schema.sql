-- Enums
CREATE TYPE tournament_status AS ENUM ('upcoming', 'ongoing', 'completed');
CREATE TYPE tournament_format AS ENUM ('groups', 'knockout', 'groups+knockout', 'league');
CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed');

-- Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Torneos
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL CHECK (char_length(name) >= 3),
    sport VARCHAR(50) NOT NULL,
    club VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    logo VARCHAR(500),
    status tournament_status NOT NULL DEFAULT 'upcoming',
    teams_count INT NOT NULL CHECK (teams_count >= 2 AND teams_count <= 32),
    format tournament_format NOT NULL,
    courts TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Equipos
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    initials VARCHAR(3) NOT NULL CHECK (initials ~ '^[A-Z]{1,3}$'),
    logo VARCHAR(500),
    primary_color VARCHAR(7) NOT NULL CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    secondary_color VARCHAR(7) NOT NULL CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at TIMESTAMP DEFAULT NOW(),
    city VARCHAR(100),
    department VARCHAR(100),
    category VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Relación Torneo-Equipo
CREATE TABLE tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, team_id)
);

-- Partidos
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team1_id UUID NOT NULL REFERENCES teams(id),
    team2_id UUID NOT NULL REFERENCES teams(id),
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL,
    court VARCHAR(100) NOT NULL,
    referee VARCHAR(100),
    status match_status NOT NULL DEFAULT 'upcoming',
    score_team1 INT DEFAULT NULL CHECK (score_team1 IS NULL OR score_team1 >= 0),
    score_team2 INT DEFAULT NULL CHECK (score_team2 IS NULL OR score_team2 >= 0),
    phase VARCHAR(50) NOT NULL,
    group_name VARCHAR(50),
    duration INT CHECK (duration IS NULL OR duration > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT different_teams CHECK (team1_id != team2_id)
);

-- Sets de cada partido
CREATE TABLE set_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number INT NOT NULL CHECK (set_number >= 1 AND set_number <= 5),
    team1_points INT NOT NULL CHECK (team1_points >= 0),
    team2_points INT NOT NULL CHECK (team2_points >= 0),
    UNIQUE(match_id, set_number)
);

-- Clasificaciones
CREATE TABLE standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    group_name VARCHAR(50),
    position INT NOT NULL,
    played INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    sets_for INT NOT NULL DEFAULT 0,
    sets_against INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    is_qualified BOOLEAN DEFAULT FALSE,
    UNIQUE(tournament_id, team_id, group_name)
);

-- Bracket de eliminación
CREATE TABLE bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team1_id UUID REFERENCES teams(id),
    team2_id UUID REFERENCES teams(id),
    winner_id UUID REFERENCES teams(id),
    score_team1 INT CHECK (score_team1 IS NULL OR score_team1 >= 0),
    score_team2 INT CHECK (score_team2 IS NULL OR score_team2 >= 0),
    status match_status NOT NULL DEFAULT 'upcoming',
    round VARCHAR(50) NOT NULL,
    position INT NOT NULL
);

-- Configuración del sistema
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR(100) DEFAULT 'SPK-CUP',
    club_name VARCHAR(100),
    location VARCHAR(200),
    language VARCHAR(10) DEFAULT 'es',
    contact_email VARCHAR(200),
    website VARCHAR(300),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_set_scores_match ON set_scores(match_id);
CREATE INDEX idx_standings_tournament ON standings(tournament_id);
CREATE INDEX idx_bracket_tournament ON bracket_matches(tournament_id);
CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id);
