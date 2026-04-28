import { Router } from 'express';
import { getTelegramLink } from '../controllers/telegram.controller';

const router = Router();

router.get('/link', getTelegramLink);

export default router;