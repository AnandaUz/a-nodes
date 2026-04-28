import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Не авторизован: отсутствует токен' });
    }

    const token = authHeader.split(' ')[1] as string;
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Не авторизован: невалидный токен' });
    }

    req.user = decoded;
    next();
};
