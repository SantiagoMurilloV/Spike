import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../config/database';
import { bracketGenerator } from '../services/bracket.service';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getMatches,
  getStandings,
  recalculateStandings,
  getBracket,
  getEnrolledTeams,
  enrollTeam,
  unenrollTeam,
  generateFixtures,
  generateManualFixtures,
  generateBracketCrossings,
  updateBracketMatch,
  clearFixtures,
  resolveBracket,
} from '../controllers/tournament.controller';

const router = Router();

// CRUD
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Tournament sub-resources
router.get('/:id/matches', getMatches);
router.get('/:id/standings', getStandings);
router.post('/:id/standings/recalculate', recalculateStandings);
router.get('/:id/bracket', getBracket);

// Team enrollment
router.get('/:id/teams', getEnrolledTeams);
router.post('/:id/teams', enrollTeam);
router.delete('/:id/teams/:teamId', unenrollTeam);

// Fixture generation
router.post('/:id/generate-fixtures', generateFixtures);
router.post('/:id/generate-manual-fixtures', generateManualFixtures);
router.post('/:id/generate-bracket-crossings', generateBracketCrossings);
router.delete('/:id/fixtures', clearFixtures);
router.post('/:id/resolve-bracket', resolveBracket);

// Bracket match update
router.put('/:id/bracket/:matchId', updateBracketMatch);

// Diagnostic endpoint — public-readable summary of the bracket vs
// matches state. Useful to debug "the bracket has teams but Partidos
// is empty" without browser access. Returns:
//   · bracket rows with their team1_id / team2_id / round / position /
//     placeholder values
//   · how many `matches` rows already point at a bracket_match_id
//   · the materializer counters (run as a dry probe + actual run)
router.get('/:id/bracket-debug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const pool = getPool();

    const tournRes = await pool.query(
      'SELECT id, name, courts, start_date, bracket_mode FROM tournaments WHERE id = $1',
      [id],
    );
    if (tournRes.rows.length === 0) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const bracketRes = await pool.query(
      `SELECT id, round, position, team1_id, team2_id,
              team1_placeholder, team2_placeholder, status, winner_id
         FROM bracket_matches
         WHERE tournament_id = $1
         ORDER BY round, position`,
      [id],
    );

    const linkedMatchesRes = await pool.query(
      `SELECT id, bracket_match_id, team1_id, team2_id, phase, status, date, time, court
         FROM matches
         WHERE tournament_id = $1 AND bracket_match_id IS NOT NULL
         ORDER BY date, time`,
      [id],
    );

    const standingsRes = await pool.query(
      `SELECT team_id, group_name, position, played
         FROM standings
         WHERE tournament_id = $1
         ORDER BY group_name, position`,
      [id],
    );

    // Run a real materialize so the response shows what the next
    // call would actually do.
    const materializeReport = await bracketGenerator
      .materializePendingBracketMatches(id)
      .catch((err) => ({ error: err instanceof Error ? err.message : String(err) }));

    res.json({
      tournament: tournRes.rows[0],
      bracketCount: bracketRes.rows.length,
      bracketSample: bracketRes.rows,
      linkedMatchesCount: linkedMatchesRes.rows.length,
      linkedMatches: linkedMatchesRes.rows,
      standingsCount: standingsRes.rows.length,
      standingsSample: standingsRes.rows.slice(0, 30),
      materializeReport,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
