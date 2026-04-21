import { Router } from 'express';
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

export default router;
