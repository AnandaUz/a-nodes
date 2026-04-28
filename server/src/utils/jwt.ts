import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export interface TokenPayload {
  id: string;
  googleId: string;
  email?: string | undefined;
  name?: string | undefined;
  picture?: string | undefined;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ id: payload.id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { id: string } | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
  } catch {
    return null;
  }
};