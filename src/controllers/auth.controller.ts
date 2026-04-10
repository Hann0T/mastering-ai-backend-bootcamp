import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login({
      ...req.body,
      deviceInfo: req.headers['user-agent'],
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.body.refreshToken);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}
