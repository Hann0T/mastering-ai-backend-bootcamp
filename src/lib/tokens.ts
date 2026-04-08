import jwt from 'jsonwebtoken';

const ACCESS_KEY = `${process.env.JWT_ACCESS_SECRET}`;
const REFRESH_KEY = `${process.env.JWT_REFRESH_SECRET}`;

interface TokenPayload {
  sub: string;
  role: string;
  type: 'access' | 'refresh';
}

export function generateAccessToken(user: { id: string, tier: string }): string {
  return jwt.sign(
    { sub: user.id, role: user.tier, type: 'access' },
    ACCESS_KEY,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user: { id: string, tier: string }): string {
  return jwt.sign(
    { sub: user.id, role: user.tier, type: 'refresh' },
    REFRESH_KEY,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_KEY) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_KEY) as TokenPayload;
}
