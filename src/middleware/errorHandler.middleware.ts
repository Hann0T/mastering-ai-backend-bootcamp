import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Operational error: we created this intentionally
  if (err instanceof AppError) {
    console.warn(
      `[${err.code}] ${err.message}`,
      err.details ? { details: err.details } : ''
    );
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.isOperational ? err.code : 'INTERNAL_ERROR',
        message: err.isOperational ? err.message : 'Internal server error',
        ...((err.isOperational && err.details) && { details: err.details })
      }
    });
  }

  // Programming error: this is a bug
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }
  });
};
