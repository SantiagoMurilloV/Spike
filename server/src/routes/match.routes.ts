import { Router } from 'express';
import {
  getAll,
  getById,
  create,
  update,
  updateScore,
  remove,
} from '../controllers/match.controller';

const router = Router();

// CRUD
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Score update
router.put('/:id/score', updateScore);

export default router;
