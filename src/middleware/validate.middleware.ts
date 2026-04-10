import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type RequestSchema = z.ZodType<{
  body?: any;
  query?: any;
  params?: any;
}>;

export function validate<T extends RequestSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.slice(1).join('.'), // remove 'body'|'query'|'params' prefix
        message: issue.message,
      }));

      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      });
    }

    // replace the original request data with the validated and transformed data
    req.body = result.data.body ?? req.body;
    req.params = result.data.params ?? req.params;
    // req.query = result.data.query ?? req.query; // error, why
    Object.assign(req.query, result.data.query); // better way to do this?

    next();
  };
}
