import { Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';

export const getTelegramLink = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token as string);
    if (!payload) return res.status(401).json({ error: 'Невалидный токен' });

    const botName = process.env.BOT_NAME;
    if (!botName) return res.status(500).json({ error: 'BOT_NAME не задан' });
 
    const link = `https://t.me/${botName}?start=${payload.id}`;

    res.json({ link });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};