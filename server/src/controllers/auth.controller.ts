import { Request, Response } from 'express';
import { LoginTicket, OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from '../utils/jwt';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    const { credential } = req.body;
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) throw new Error('GOOGLE_CLIENT_ID не задан');

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId,
        }) as LoginTicket;
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ error: 'Невалидный токен Google' });
        }

        // Поиск или создание пользователя в БД
        let isNew = false;
        let user = await User.findOne({ googleId: payload.sub });

        if (!user) {
            isNew = true;
            user = new User({
                googleId: payload.sub,
                name: payload.name || 'Anonymous',
                isRegistered: false,
                settings: {
                    account: { weightStart: undefined },
                    privacy: { showMyPage: false },
                    goals: []
                }
            });
            await user.save();
        } else {
            if (payload.name) {
                user.name = payload.name;
            }
            await user.save();
        }

        // Генерируем собственный JWT для сессии
        const token = generateToken({
            id: user._id.toString(),
            googleId: user.googleId,
            email: payload.email,
            name: user.name,
            ...(payload.picture && { picture: payload.picture }),
        });

        const refreshToken = generateRefreshToken({
            id: user._id.toString(),
            googleId: user.googleId,
        });
        // Сохраняем токен в БД для пользователя
        user.token = token;
        await user.save();

        return res.json({
            token,
            refreshToken,
            isNew,
            user: {
                id: user._id,
                googleId: user.googleId,
                email: payload.email,
                name: user.name,
                picture: payload.picture,
                isRegistered: user.isRegistered,
                weightStart: user.settings.account.weightStart,
                telegramId: user.telegramId
            }
        });
    } catch (error) {
        console.error('Ошибка верификации токена Google:', error);
        res.status(401).json({ error: 'Ошибка авторизации' });
    }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Имя слишком короткое' });
    }

    // Берём пользователя из токена
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1] as string;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Невалидный токен' });

    // Обновляем пользователя в базе
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    user.name = name.trim();
    user.isRegistered = true;
    await user.save();

    // Генерируем новый токен с обновлённым именем
    const newToken = generateToken({
      id: user._id.toString(),
      googleId: user.googleId,
      email: payload.email,
      name: user.name,
      ...(payload.picture && { picture: payload.picture }),
    });

    return res.json({ token: newToken });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
export const verifySession = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1] as string;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Токен недействителен' });

    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    return res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ error: 'Ошибка проверки токена' });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1] as string;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Невалидный токен' });

    // Чистим токен в базе
    await User.findByIdAndUpdate(payload.id, { $unset: { token: '' } });

    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Нет refresh токена' });

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ error: 'Невалидный refresh токен' });

    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const newToken = generateToken({
      id: user._id.toString(),
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      ...(user.picture && { picture: user.picture }),
    });

    const newRefreshToken = generateRefreshToken({
      id: user._id.toString(),
      googleId: user.googleId,
    });

    return res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: 'Ошибка обновления токена' });
  }
};