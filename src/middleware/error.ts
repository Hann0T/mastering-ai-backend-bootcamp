import type { Request, Response, NextFunction } from 'express';

export function error(err: any, req: Request, res: Response, next: NextFunction) {
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
};
