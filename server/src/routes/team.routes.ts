import { Router } from 'express';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getMatches,
  generateCredentials,
  getCredentials,
} from '../controllers/team.controller';
import {
  listByTeam as listPlayers,
  getById as getPlayerById,
  create as createPlayer,
  update as updatePlayer,
  remove as removePlayer,
} from '../controllers/player.controller';
import { requireRole, requireTeamAccess } from '../middleware/auth';

const router = Router();

// CRUD
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Team sub-resources
router.get('/:id/matches', getMatches);

// Captain credentials — admins (and super_admins) can look up, (re)generate
// a team captain's login.
//   GET    → returns {username, password?, generatedAt, recoveryEnabled}.
//            password is plaintext when PLATFORM_RECOVERY_KEY decrypts the
//            stored AES-GCM blob; null otherwise. 404 if never generated.
//   POST   → generates or rotates and returns the plaintext exactly once.
router.get(
  '/:teamId/credentials',
  requireRole('admin', 'super_admin'),
  getCredentials
);
router.post(
  '/:teamId/credentials',
  requireRole('admin', 'super_admin'),
  generateCredentials
);

// Roster — nested under /teams/:teamId/players
// GET is public (read-only); POST/PUT/DELETE require an authenticated caller
// who either has global access (admin/super_admin) or is the team's captain.
router.get('/:teamId/players', listPlayers);
router.get('/:teamId/players/:playerId', getPlayerById);
router.post('/:teamId/players', requireTeamAccess, createPlayer);
router.put('/:teamId/players/:playerId', requireTeamAccess, updatePlayer);
router.delete('/:teamId/players/:playerId', requireTeamAccess, removePlayer);

export default router;
