import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/tokens';

declare global {
  namespace Express {
    export interface Request {
      user?: { id: string, role: string };
    }
  }
}

export function authenticate(
  req: Request, res: Response, next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Auth Token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid Authorization header format' });
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
