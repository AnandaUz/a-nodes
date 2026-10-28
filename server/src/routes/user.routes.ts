import { Router } from 'express';
import { getAllUsers, getUserById, updateSettings, recordPageView, getAdminUsersStats } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Фиксация просмотра страницы
router.post('/pageview', authenticate, recordPageView);

// Получение статистики пользователей администратором
router.get('/admin/stats', authenticate, requireAdmin, getAdminUsersStats);

router.get('/', getAllUsers);

router.get('/:id', getUserById);

// Используем PUT для обновления
router.put('/:id/settings', updateSettings);

export default router;

