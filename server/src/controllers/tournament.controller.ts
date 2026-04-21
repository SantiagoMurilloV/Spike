import { Request, Response, NextFunction } from 'express';
import { tournamentService } from '../services/tournament.service';
import { enrollmentService } from '../services/enrollment.service';
import { fixtureGenerator } from '../services/fixture.service';
import { bracketGenerator } from '../services/bracket.service';
import { standingsCalculator } from '../services/standings.service';
import { validateUUID } from '../middleware/validation';
import { ValidationError } from '../middleware/errorHandler';

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tournaments = await tournamentService.getAll();
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const tournament = await tournamentService.getById(id);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tournament = await tournamentService.create(req.body);
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const tournament = await tournamentService.update(id, req.body);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    await tournamentService.delete(id);
    res.json({ message: 'Torneo eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
}

export async function getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const matches = await tournamentService.getMatches(id);
    res.json(matches);
  } catch (error) {
    next(error);
  }
}

export async function getStandings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const standings = await tournamentService.getStandings(id);
    res.json(standings);
  } catch (error) {
    next(error);
  }
}

/**
 * Force-recalculate and persist the standings for a tournament. Used by the
 * admin UI's "Recalcular tabla" button when a rule change shipped (e.g. the
 * new volleyball point system) or when standings data got out of sync with
 * the underlying matches.
 */
export async function recalculateStandings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const standings = await standingsCalculator.recalculate(id);
    res.json(standings);
  } catch (error) {
    next(error);
  }
}

export async function getBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const bracket = await tournamentService.getBracket(id);
    res.json(bracket);
  } catch (error) {
    next(error);
  }
}

export async function getEnrolledTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const teams = await enrollmentService.getEnrolledTeams(id);
    res.json(teams);
  } catch (error) {
    next(error);
  }
}

export async function enrollTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const { teamId } = req.body;
    const enrolled = await enrollmentService.enroll(id, teamId);
    res.status(201).json(enrolled);
  } catch (error) {
    next(error);
  }
}

export async function unenrollTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const teamId = req.params.teamId as string;
    validateUUID(teamId, 'ID de equipo');
    await enrollmentService.unenroll(id, teamId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function generateFixtures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const { schedule } = req.body || {};
    const result = await fixtureGenerator.generate(id, schedule);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function generateManualFixtures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const { groups, bracketSeeds, schedule } = req.body;
    const result = await fixtureGenerator.generateManual(id, { groups, bracketSeeds, schedule });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function clearFixtures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    await fixtureGenerator.clearFixtures(id);
    // Also clear standings
    const { getPool } = await import('../config/database');
    const pool = getPool();
    await pool.query('DELETE FROM standings WHERE tournament_id = $1', [id]);
    res.json({ message: 'Cruces eliminados' });
  } catch (error) {
    next(error);
  }
}

export async function updateBracketMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tournamentId = req.params.id as string;
    const matchId = req.params.matchId as string;
    validateUUID(tournamentId, 'ID de torneo');
    validateUUID(matchId, 'ID de partido de bracket');

    const { scoreTeam1, scoreTeam2, status, sets } = req.body;

    // Update score fields on the bracket match
    const pool = (await import('../config/database')).getPool();

    // Verify the bracket match belongs to this tournament
    const bmResult = await pool.query(
      'SELECT * FROM bracket_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, tournamentId]
    );
    if (bmResult.rows.length === 0) {
      throw new ValidationError('Partido de bracket no encontrado en este torneo');
    }

    const bm = bmResult.rows[0];

    // Update score and status
    await pool.query(
      `UPDATE bracket_matches SET score_team1 = $1, score_team2 = $2, status = $3 WHERE id = $4`,
      [scoreTeam1 ?? bm.score_team1, scoreTeam2 ?? bm.score_team2, status ?? bm.status, matchId]
    );

    // If completed, determine winner and advance
    if (status === 'completed' && bm.team1_id && bm.team2_id) {
      // Determine winner from sets if provided, otherwise from scores
      let winnerId: string;
      if (sets && sets.length > 0) {
        let team1SetsWon = 0;
        let team2SetsWon = 0;
        for (const s of sets) {
          if (s.team1Points > s.team2Points) team1SetsWon++;
          else if (s.team2Points > s.team1Points) team2SetsWon++;
        }
        winnerId = team1SetsWon > team2SetsWon ? bm.team1_id : bm.team2_id;
      } else {
        winnerId = (scoreTeam1 ?? 0) > (scoreTeam2 ?? 0) ? bm.team1_id : bm.team2_id;
      }

      // Use bracketGenerator.advanceWinner to set winner and advance to next round
      await bracketGenerator.advanceWinner(matchId, winnerId);
    }

    // Return updated bracket for the tournament
    const bracket = await bracketGenerator.getBracket(tournamentId);
    res.json(bracket);
  } catch (error) {
    next(error);
  }
}

export async function generateBracketCrossings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');
    const { seeds } = req.body;
    if (!seeds || !Array.isArray(seeds) || seeds.length === 0) {
      throw new ValidationError('Se requieren las posiciones del bracket (seeds)');
    }
    const bracketMatches = await fixtureGenerator.generateBracketCrossings(id, seeds);
    res.json({ bracketMatches, generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}

export async function resolveBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    validateUUID(id, 'ID de torneo');

    const pool = (await import('../config/database')).getPool();

    // Fetch standings
    const standingsResult = await pool.query(
      'SELECT team_id, group_name, position FROM standings WHERE tournament_id = $1',
      [id]
    );
    const standings = standingsResult.rows;

    // Helper to resolve placeholder (format "{position}|{groupName}")
    const resolvePlaceholder = (placeholder: string | null) => {
      if (!placeholder) return null;
      const firstPipe = placeholder.indexOf('|');
      if (firstPipe === -1) return null; // Invalid format
      const pos = parseInt(placeholder.substring(0, firstPipe), 10);
      const groupName = placeholder.substring(firstPipe + 1);

      const found = standings.find((s) => s.group_name === groupName && s.position === pos);
      return found ? found.team_id : null;
    };

    // Fetch unresolved bracket matches
    const bmResult = await pool.query(
      `SELECT * FROM bracket_matches WHERE tournament_id = $1 AND (team1_placeholder IS NOT NULL OR team2_placeholder IS NOT NULL)`,
      [id]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let updatedCount = 0;

      for (const bm of bmResult.rows) {
        const newTeam1Id = bm.team1_id || resolvePlaceholder(bm.team1_placeholder);
        const newTeam2Id = bm.team2_id || resolvePlaceholder(bm.team2_placeholder);

        if (newTeam1Id !== bm.team1_id || newTeam2Id !== bm.team2_id) {
          await client.query(
            `UPDATE bracket_matches SET team1_id = $1, team2_id = $2 WHERE id = $3`,
            [newTeam1Id, newTeam2Id, bm.id]
          );
          updatedCount++;
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Return the updated bracket
    const bracket = await bracketGenerator.getBracket(id);
    res.json(bracket);
  } catch (error) {
    next(error);
  }
}
