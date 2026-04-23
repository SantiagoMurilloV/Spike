import { Router } from 'express';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getMatches,
  generateCredentials,
} from '../controllers/team.controller';
import {
  listByTeam as listPlayers,
  getById as getPlayerById,
  create as createPlayer,
  update as updatePlayer,
  remove as removePlayer,
} from '../controllers/player.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// CRUD
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Team sub-resources
router.get('/:id/matches', getMatches);

// Captain credentials — admins (and super_admins) can (re)generate a team
// captain's login. Returns the plaintext password exactly once.
router.post(
  '/:teamId/credentials',
  requireRole('admin', 'super_admin'),
  generateCredentials
);

// Roster — nested under /teams/:teamId/players
// GET is public (read-only); POST/PUT/DELETE go through authMiddleware.
router.get('/:teamId/players', listPlayers);
router.get('/:teamId/players/:playerId', getPlayerById);
router.post('/:teamId/players', createPlayer);
router.put('/:teamId/players/:playerId', updatePlayer);
router.delete('/:teamId/players/:playerId', removePlayer);

export default router;
