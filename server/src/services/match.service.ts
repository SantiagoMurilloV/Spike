import { getPool } from '../config/database';
import {
  Match,
  SetScore,
  CreateMatchDto,
  UpdateMatchDto,
  ScoreUpdate,
  ValidationResult,
} from '../types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { standingsCalculator } from './standings.service';

function mapRow(row: Record<string, unknown>): Match {
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
    scoreTeam1: row.score_team1 != null ? (row.score_team1 as number) : undefined,
    scoreTeam2: row.score_team2 != null ? (row.score_team2 as number) : undefined,
    phase: row.phase as string,
    groupName: row.group_name as string | undefined,
    duration: row.duration != null ? (row.duration as number) : undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function mapSetRow(row: Record<string, unknown>): SetScore {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    setNumber: row.set_number as number,
    team1Points: row.team1_points as number,
    team2Points: row.team2_points as number,
  };
}

export class MatchService {
  async getAll(): Promise<Match[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM matches ORDER BY date, time');
    const matches = result.rows.map(mapRow);
    return this.attachSets(matches);
  }

  async getById(id: string): Promise<Match> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Partido');
    }
    const match = mapRow(result.rows[0]);
    const sets = await this.getSets(id);
    match.sets = sets;
    return match;
  }

  async getByTournament(tournamentId: string): Promise<Match[]> {
    // Verify tournament exists
    const pool = getPool();
    const tournamentCheck = await pool.query('SELECT id FROM tournaments WHERE id = $1', [tournamentId]);
    if (tournamentCheck.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }
    const result = await pool.query(
      'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY date, time',
      [tournamentId]
    );
    const matches = result.rows.map(mapRow);
    return this.attachSets(matches);
  }

  async create(data: CreateMatchDto): Promise<Match> {
    await this.validateData(data);
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO matches (tournament_id, team1_id, team2_id, date, time, court, referee, phase, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.tournamentId,
        data.team1Id,
        data.team2Id,
        data.date,
        data.time,
        data.court,
        data.referee || null,
        data.phase,
        data.groupName || null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateMatchDto): Promise<Match> {
    // Ensure match exists
    await this.getById(id);

    // If updating team references, validate them
    if (data.team1Id !== undefined || data.team2Id !== undefined || data.tournamentId !== undefined) {
      const existing = await this.getById(id);
      const mergedTeam1 = data.team1Id ?? existing.team1Id;
      const mergedTeam2 = data.team2Id ?? existing.team2Id;
      const mergedTournament = data.tournamentId ?? existing.tournamentId;

      if (mergedTeam1 === mergedTeam2) {
        throw new ValidationError('Los dos equipos deben ser diferentes');
      }

      const pool = getPool();
      if (data.tournamentId !== undefined) {
        const tCheck = await pool.query('SELECT id FROM tournaments WHERE id = $1', [mergedTournament]);
        if (tCheck.rows.length === 0) {
          throw new NotFoundError('Torneo');
        }
      }
      if (data.team1Id !== undefined) {
        const t1Check = await pool.query('SELECT id FROM teams WHERE id = $1', [mergedTeam1]);
        if (t1Check.rows.length === 0) {
          throw new NotFoundError('Equipo 1');
        }
      }
      if (data.team2Id !== undefined) {
        const t2Check = await pool.query('SELECT id FROM teams WHERE id = $1', [mergedTeam2]);
        if (t2Check.rows.length === 0) {
          throw new NotFoundError('Equipo 2');
        }
      }
    }

    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const columnMap: Record<string, string> = {
      tournamentId: 'tournament_id',
      team1Id: 'team1_id',
      team2Id: 'team2_id',
      date: 'date',
      time: 'time',
      court: 'court',
      referee: 'referee',
      status: 'status',
      scoreTeam1: 'score_team1',
      scoreTeam2: 'score_team2',
      phase: 'phase',
      groupName: 'group_name',
      duration: 'duration',
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

    const query = `UPDATE matches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    return mapRow(result.rows[0]);
  }

  async updateScore(id: string, score: ScoreUpdate): Promise<Match> {
    // Ensure match exists
    const existing = await this.getById(id);
    const pool = getPool();

    // Validate set points are non-negative integers
    if (score.sets) {
      for (const set of score.sets) {
        if (!Number.isInteger(set.setNumber) || set.setNumber < 1 || set.setNumber > 5) {
          throw new ValidationError('El número de set debe ser un entero entre 1 y 5');
        }
        if (!Number.isInteger(set.team1Points) || set.team1Points < 0) {
          throw new ValidationError('Los puntos del equipo 1 deben ser un entero no negativo');
        }
        if (!Number.isInteger(set.team2Points) || set.team2Points < 0) {
          throw new ValidationError('Los puntos del equipo 2 deben ser un entero no negativo');
        }
      }
    }

    if (score.duration !== undefined && (score.duration <= 0 || !Number.isInteger(score.duration))) {
      throw new ValidationError('La duración debe ser un entero positivo');
    }

    // Update match fields
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (score.status !== undefined) {
      fields.push(`status = $${idx}`);
      values.push(score.status);
      idx++;
    }
    if (score.scoreTeam1 !== undefined) {
      fields.push(`score_team1 = $${idx}`);
      values.push(score.scoreTeam1);
      idx++;
    }
    if (score.scoreTeam2 !== undefined) {
      fields.push(`score_team2 = $${idx}`);
      values.push(score.scoreTeam2);
      idx++;
    }
    if (score.duration !== undefined) {
      fields.push(`duration = $${idx}`);
      values.push(score.duration);
      idx++;
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(id);
      const query = `UPDATE matches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      await pool.query(query, values);
    }

    // Upsert sets and remove deleted ones
    if (score.sets) {
      if (score.sets.length > 0) {
        // Delete sets that are no longer in the list
        const setNumbers = score.sets.map(s => s.setNumber);
        await pool.query(
          'DELETE FROM set_scores WHERE match_id = $1 AND set_number != ALL($2)',
          [id, setNumbers]
        );
        for (const set of score.sets) {
          await pool.query(
            `INSERT INTO set_scores (match_id, set_number, team1_points, team2_points)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (match_id, set_number)
             DO UPDATE SET team1_points = $3, team2_points = $4`,
            [id, set.setNumber, set.team1Points, set.team2Points]
          );
        }
      } else {
        // Empty sets array means remove all sets
        await pool.query('DELETE FROM set_scores WHERE match_id = $1', [id]);
      }
    }

    // When match status changes to "completed", trigger standings recalculation
    const previousStatus = existing.status;
    if (score.status === 'completed' && previousStatus !== 'completed') {
      await standingsCalculator.recalculate(existing.tournamentId);
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    // Ensure match exists
    await this.getById(id);
    const pool = getPool();
    // set_scores are deleted via CASCADE
    await pool.query('DELETE FROM matches WHERE id = $1', [id]);
  }

  async validateData(data: CreateMatchDto): Promise<ValidationResult> {
    validate(data as unknown as Record<string, unknown>, [
      { field: 'tournamentId', label: 'Torneo', required: true, type: 'string' },
      { field: 'team1Id', label: 'Equipo 1', required: true, type: 'string' },
      { field: 'team2Id', label: 'Equipo 2', required: true, type: 'string' },
      { field: 'date', label: 'Fecha', required: true, type: 'string' },
      { field: 'time', label: 'Hora', required: true, type: 'string' },
      { field: 'court', label: 'Cancha', required: true, type: 'string' },
      { field: 'phase', label: 'Fase', required: true, type: 'string' },
    ]);

    // Validate teams are different
    if (data.team1Id === data.team2Id) {
      throw new ValidationError('Los dos equipos deben ser diferentes');
    }

    // Validate tournament exists
    const pool = getPool();
    const tournamentCheck = await pool.query('SELECT id FROM tournaments WHERE id = $1', [data.tournamentId]);
    if (tournamentCheck.rows.length === 0) {
      throw new NotFoundError('Torneo');
    }

    // Validate team1 exists
    const team1Check = await pool.query('SELECT id FROM teams WHERE id = $1', [data.team1Id]);
    if (team1Check.rows.length === 0) {
      throw new NotFoundError('Equipo 1');
    }

    // Validate team2 exists
    const team2Check = await pool.query('SELECT id FROM teams WHERE id = $1', [data.team2Id]);
    if (team2Check.rows.length === 0) {
      throw new NotFoundError('Equipo 2');
    }

    return { valid: true, errors: [] };
  }

  // --- Private helpers ---

  private async getSets(matchId: string): Promise<SetScore[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM set_scores WHERE match_id = $1 ORDER BY set_number',
      [matchId]
    );
    return result.rows.map(mapSetRow);
  }

  private async attachSets(matches: Match[]): Promise<Match[]> {
    if (matches.length === 0) return matches;
    const pool = getPool();
    const matchIds = matches.map(m => m.id);
    const result = await pool.query(
      'SELECT * FROM set_scores WHERE match_id = ANY($1) ORDER BY set_number',
      [matchIds]
    );
    const setsByMatch = new Map<string, SetScore[]>();
    for (const row of result.rows) {
      const set = mapSetRow(row);
      const existing = setsByMatch.get(set.matchId) || [];
      existing.push(set);
      setsByMatch.set(set.matchId, existing);
    }
    for (const match of matches) {
      match.sets = setsByMatch.get(match.id) || [];
    }
    return matches;
  }
}

export const matchService = new MatchService();
