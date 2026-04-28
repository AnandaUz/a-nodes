import { Router } from 'express';
import { googleAuth, logout, refresh, registerUser, verifySession } from '../controllers/auth.controller';

const router = Router();

router.get('/verify', verifySession);

router.post('/google', googleAuth);
router.post('/register', registerUser);
router.post('/logout', logout);
router.post('/refresh', refresh);

export default router;

