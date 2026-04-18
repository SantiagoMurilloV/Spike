import { Router } from 'express';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getMatches,
} from '../controllers/team.controller';

const router = Router();

// CRUD
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Team sub-resources
router.get('/:id/matches', getMatches);

export default router;
