import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Operational error: we created this intentionally
  if (err instanceof AppError) {
    logger.warn('App error', {
      message: scrubSensitiveData(err.message),
      code: err.code,
      details: err.details,
    });
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.isOperational
          ? err.code
          : 'INTERNAL_ERROR',
        message: err.isOperational
          ? scrubSensitiveData(err.message)
          : 'Internal server error',
        ...((err.isOperational && err.details) && { details: err.details })
      }
    });
  }

  console.log('Unexpected error', err);
  // Programming error: this is a bug
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }
  });
};

// TODO: use it
function scrubSensitiveData(data: any): any {
  if (typeof data !== 'string') return data;

  const patterns = [
    /Bearer [A-Za-z0-9\-._~+\/]+=*/g,  // JWT tokens
    /sk-[A-Za-z0-9]{20,}/g,              // OpenAI keys
    /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, // password in any format
  ];

  let scrubbed = data;
  for (const pattern of patterns) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  return scrubbed;
}
