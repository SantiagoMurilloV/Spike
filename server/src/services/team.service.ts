import { getPool } from '../config/database';
import {
  Team,
  CreateTeamDto,
  UpdateTeamDto,
  ValidationResult,
  Match,
} from '../types';
import { NotFoundError, AppError } from '../middleware/errorHandler';
import { validate, validateHexColor } from '../middleware/validation';

function mapRow(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    initials: row.initials as string,
    logo: row.logo as string | undefined,
    primaryColor: row.primary_color as string,
    secondaryColor: row.secondary_color as string,
    city: row.city as string | undefined,
    department: row.department as string | undefined,
    category: row.category as string | undefined,
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

export class TeamService {
  async getAll(): Promise<Team[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM teams ORDER BY name');
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Team> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM teams WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Equipo');
    }
    return mapRow(result.rows[0]);
  }

  async create(data: CreateTeamDto): Promise<Team> {
    this.validateData(data);
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO teams (name, initials, logo, primary_color, secondary_color, city, department, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.name,
        data.initials,
        data.logo || null,
        data.primaryColor,
        data.secondaryColor,
        data.city || null,
        data.department || null,
        data.category || null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateTeamDto): Promise<Team> {
    // Ensure team exists
    await this.getById(id);

    // Validate fields if provided
    if (data.initials !== undefined || data.primaryColor !== undefined || data.secondaryColor !== undefined) {
      const existing = await this.getById(id);
      const merged = { ...existing, ...data } as CreateTeamDto;
      this.validateData(merged);
    }

    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const columnMap: Record<string, string> = {
      name: 'name',
      initials: 'initials',
      logo: 'logo',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      city: 'city',
      department: 'department',
      category: 'category',
    };

    for (const [key, column] of Object.entries(columnMap)) {
      if ((data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${column} = $${idx}`);
        values.push((data as Record<string, unknown>)[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    return mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    // Ensure team exists
    await this.getById(id);

    const pool = getPool();

    // Block deletion if the team has any active matches (live or upcoming).
    // Completed matches are retained via ON DELETE CASCADE cleanup in migration 005.
    const activeMatches = await pool.query(
      `SELECT COUNT(*) as count FROM matches
       WHERE (team1_id = $1 OR team2_id = $1)
       AND status IN ('live', 'upcoming')`,
      [id]
    );

    if (parseInt(activeMatches.rows[0].count, 10) > 0) {
      throw new AppError(
        400,
        'No se puede eliminar el equipo porque tiene partidos activos'
      );
    }

    // DB handles cascade cleanup:
    //   matches, standings, tournament_teams → CASCADE
    //   bracket_matches team*_id / winner_id → SET NULL
    await pool.query('DELETE FROM teams WHERE id = $1', [id]);
  }

  async getMatches(teamId: string): Promise<Match[]> {
    // Ensure team exists
    await this.getById(teamId);
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM matches
       WHERE team1_id = $1 OR team2_id = $1
       ORDER BY date, time`,
      [teamId]
    );
    return result.rows.map(mapMatchRow);
  }

  validateData(data: CreateTeamDto): ValidationResult {
    validate(data as unknown as Record<string, unknown>, [
      { field: 'name', label: 'Nombre', required: true, type: 'string' },
      {
        field: 'initials',
        label: 'Iniciales',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 3,
        pattern: /^[A-Z]{1,3}$/,
        patternMessage: 'Las iniciales deben ser de 1 a 3 letras mayúsculas',
      },
      { field: 'primaryColor', label: 'Color primario', required: true, type: 'string' },
      { field: 'secondaryColor', label: 'Color secundario', required: true, type: 'string' },
    ]);

    validateHexColor(data.primaryColor, 'Color primario');
    validateHexColor(data.secondaryColor, 'Color secundario');

    return { valid: true, errors: [] };
  }
}

export const teamService = new TeamService();
