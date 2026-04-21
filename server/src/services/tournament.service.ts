import { getPool } from '../config/database';
import {
  Tournament,
  CreateTournamentDto,
  UpdateTournamentDto,
  ValidationResult,
  Match,
  StandingsRow,
  BracketMatch,
} from '../types';
import { NotFoundError } from '../middleware/errorHandler';
import { validate, validateDateRange } from '../middleware/validation';

function mapRow(row: Record<string, unknown>): Tournament {
  // court_locations may come as object (jsonb parsed by pg) or null/undefined
  const rawLocations = row.court_locations as Record<string, string> | null | undefined;
  return {
    id: row.id as string,
    name: row.name as string,
    sport: row.sport as string,
    club: row.club as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    description: row.description as string | undefined,
    coverImage: row.cover_image as string | undefined,
    logo: row.logo as string | undefined,
    status: row.status as Tournament['status'],
    teamsCount: row.teams_count as number,
    format: row.format as Tournament['format'],
    courts: row.courts as string[],
    courtLocations: rawLocations && typeof rawLocations === 'object' ? rawLocations : {},
    categories: (row.categories as string[] | null | undefined) ?? [],
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function mapMatchRow(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    team1Id: row.team1_id as string,
    team2Id: row.team2_id as string,
    date: row.date as string,
    time: row.time as string,
    court: row.court as string,
    referee: row.referee as string | undefined,
    status: row.status as Match['status'],
    scoreTeam1: row.score_team1 as number | undefined,
    scoreTeam2: row.score_team2 as number | undefined,
    phase: row.phase as string,
    groupName: row.group_name as string | undefined,
    duration: row.duration as number | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function mapStandingsRow(row: Record<string, unknown>): StandingsRow {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    teamId: row.team_id as string,
    groupName: row.group_name as string | undefined,
    position: row.position as number,
    played: row.played as number,
    wins: row.wins as number,
    losses: row.losses as number,
    setsFor: row.sets_for as number,
    setsAgainst: row.sets_against as number,
    points: row.points as number,
    isQualified: row.is_qualified as boolean,
    team: row.team_name
      ? {
          id: row.team_id as string,
          name: row.team_name as string,
          initials: row.team_initials as string,
          logo: row.team_logo as string | undefined,
          primaryColor: row.team_primary_color as string,
          secondaryColor: row.team_secondary_color as string,
          city: row.team_city as string | undefined,
          department: row.team_department as string | undefined,
          category: row.team_category as string | undefined,
        }
      : undefined,
  };
}

function mapBracketRow(row: Record<string, unknown>): BracketMatch {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    team1Id: row.team1_id as string | undefined,
    team2Id: row.team2_id as string | undefined,
    winnerId: row.winner_id as string | undefined,
    scoreTeam1: row.score_team1 as number | undefined,
    scoreTeam2: row.score_team2 as number | undefined,
    status: row.status as BracketMatch['status'],
    round: row.round as string,
    position: row.position as number,
    team1Placeholder: row.team1_placeholder as string | undefined,
    team2Placeholder: row.team2_placeholder as string | undefined,
  };
}

export class TournamentService {
  async getAll(): Promise<Tournament[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM tournaments ORDER BY start_date DESC'
    );
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Tournament> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }
    return mapRow(result.rows[0]);
  }

  async create(data: CreateTournamentDto): Promise<Tournament> {
    this.validateData(data);
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO tournaments (name, sport, club, start_date, end_date, description, cover_image, logo, status, teams_count, format, courts, court_locations, categories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        data.name,
        data.sport,
        data.club,
        data.startDate,
        data.endDate,
        data.description || null,
        data.coverImage || null,
        data.logo || null,
        data.status,
        data.teamsCount,
        data.format,
        data.courts || [],
        JSON.stringify(data.courtLocations || {}),
        data.categories ?? [],
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateTournamentDto): Promise<Tournament> {
    // Ensure tournament exists
    await this.getById(id);

    // If updating dates or name, validate them
    if (data.name !== undefined || data.startDate !== undefined || data.endDate !== undefined || data.teamsCount !== undefined) {
      const existing = await this.getById(id);
      const merged = { ...existing, ...data } as CreateTournamentDto;
      this.validateData(merged);
    }

    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const columnMap: Record<string, string> = {
      name: 'name',
      sport: 'sport',
      club: 'club',
      startDate: 'start_date',
      endDate: 'end_date',
      description: 'description',
      coverImage: 'cover_image',
      logo: 'logo',
      status: 'status',
      teamsCount: 'teams_count',
      format: 'format',
      courts: 'courts',
      courtLocations: 'court_locations',
      categories: 'categories',
    };

    for (const [key, column] of Object.entries(columnMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(column + ' = $' + idx);
        // jsonb column requires stringified JSON
        const rawValue = (data as Record<string, unknown>)[key];
        values.push(key === 'courtLocations' ? JSON.stringify(rawValue ?? {}) : rawValue);
        idx++;
      }
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const query = 'UPDATE tournaments SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *';
    const result = await pool.query(query, values);
    return mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    // Ensure tournament exists
    await this.getById(id);
    const pool = getPool();
    // CASCADE is handled by FK constraints on matches, standings, bracket_matches, tournament_teams
    await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
  }

  async getMatches(tournamentId: string): Promise<Match[]> {
    // Ensure tournament exists
    await this.getById(tournamentId);
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY date, time',
      [tournamentId]
    );
    return result.rows.map(mapMatchRow);
  }

  async getStandings(tournamentId: string): Promise<StandingsRow[]> {
    // Ensure tournament exists
    await this.getById(tournamentId);
    const pool = getPool();
    const result = await pool.query(
      `SELECT s.*, t.name AS team_name, t.initials AS team_initials, t.logo AS team_logo,
              t.primary_color AS team_primary_color, t.secondary_color AS team_secondary_color,
              t.city AS team_city, t.department AS team_department, t.category AS team_category
       FROM standings s
       LEFT JOIN teams t ON s.team_id = t.id
       WHERE s.tournament_id = $1
       ORDER BY s.group_name, s.position`,
      [tournamentId]
    );
    return result.rows.map(mapStandingsRow);
  }

  async getBracket(tournamentId: string): Promise<BracketMatch[]> {
    // Ensure tournament exists
    await this.getById(tournamentId);
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM bracket_matches WHERE tournament_id = $1 ORDER BY round, position',
      [tournamentId]
    );
    return result.rows.map(mapBracketRow);
  }

  validateData(data: CreateTournamentDto): ValidationResult {
    validate(data as unknown as Record<string, unknown>, [
      { field: 'name', label: 'Nombre', required: true, type: 'string', minLength: 3, maxLength: 100 },
      { field: 'sport', label: 'Deporte', required: true, type: 'string' },
      { field: 'club', label: 'Club', required: true, type: 'string' },
      { field: 'startDate', label: 'Fecha de inicio', required: true, type: 'string' },
      { field: 'endDate', label: 'Fecha de fin', required: true, type: 'string' },
      { field: 'status', label: 'Estado', required: true, type: 'string' },
      { field: 'teamsCount', label: 'Cantidad de equipos', required: true, type: 'number', min: 2, max: 32 },
      { field: 'format', label: 'Formato', required: true, type: 'string' },
    ]);

    validateDateRange(data.startDate, data.endDate);

    return { valid: true, errors: [] };
  }
}

export const tournamentService = new TournamentService();
