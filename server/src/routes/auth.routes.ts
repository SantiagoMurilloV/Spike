import { Router } from 'express';
import { login, logout, changePassword } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.put('/password', changePassword);

export default router;
