import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (typeof req.query?.['token'] === 'string') {
        token = req.query['token'];
    }

    if (!token) {
        return res.status(401).json({ error: 'Не авторизован: отсутствует токен' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Не авторизован: невалидный токен' });
    }

    req.user = decoded;
    next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.id !== process.env.ADMIN_USER_ID) {
        return res.status(403).json({ error: 'Доступ запрещён: требуются права администратора' });
    }
    next();
};
